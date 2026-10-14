from neo4j import GraphDatabase, Driver
from typing import List, Dict, Any, Optional
import datetime
import logging

logger = logging.getLogger("neo4j_client")

class Neo4jMemory:
    """
    Neo4j Knowledge Graph Memory client.
    Maintains graph schema: (:User {id}), (:Entity {name, category}), (:Correction {text, timestamp}), (:Attribute {key, value}).
    Features an in-memory fallback when Neo4j is unreachable.
    """
    def __init__(self, uri: str, user: str, auth: str):
        self.uri = uri
        self.user = user
        self.driver: Optional[Driver] = None
        self._fallback_entities: Dict[str, List[Dict[str, Any]]] = {}
        self._fallback_corrections: Dict[str, List[str]] = {}

        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, auth))
            # Test connectivity quickly
            with self.driver.session() as session:
                session.run("RETURN 1 AS ping")
            logger.info("Connected successfully to Neo4j at %s", uri)
        except Exception as e:
            logger.warning("Neo4j connection unavailable (%s). Using resilient in-memory Graph store.", e)
            self.driver = None

    def close(self):
        if self.driver:
            try:
                self.driver.close()
            except Exception:
                pass

    def get_user_context(self, user_id: str) -> List[str]:
        """
        Retrieves user-connected entities, relationships, and historical corrections from GraphRAG.
        """
        if not self.driver:
            records = self._fallback_entities.get(user_id, [])
            corrections = self._fallback_corrections.get(user_id, [])
            items = []
            for rec in records:
                items.append(f"Entity: {rec['name']} ({rec.get('category', 'General')}) -> Status: {rec.get('status', 'Verified')}")
            for cor in corrections:
                items.append(f"Past User Correction: {cor}")
            if not items:
                items.append("Default Profile: Verified Personal Assistant user. High verification confidence required.")
            return items

        query = """
        MATCH (u:User {id: $user_id})-[r]->(e:Entity)
        OPTIONAL MATCH (e)-[:HAS_CORRECTION]->(c:Correction)
        OPTIONAL MATCH (e)-[:HAS_ATTRIBUTE]->(a:Attribute)
        RETURN e.name AS entity, e.category AS category, type(r) AS rel, c.text AS correction, a.key AS attr_key, a.value AS attr_val
        LIMIT 25
        """
        try:
            with self.driver.session() as session:
                result = session.run(query, user_id=user_id)
                context = []
                for record in result:
                    item = f"Entity: {record['entity']} [{record.get('category') or 'Object'}] ({record['rel']})"
                    if record.get("attr_key") and record.get("attr_val"):
                        item += f" | {record['attr_key']}: {record['attr_val']}"
                    if record.get("correction"):
                        item += f" | Prior Correction: {record['correction']}"
                    context.append(item)
                return context if context else ["Knowledge Graph initialized for user; awaiting entity observations."]
        except Exception as e:
            logger.error("Neo4j retrieval error: %s", e)
            return [f"Graph retrieval fallback: {str(e)}"]

    def add_user_correction(self, user_id: str, entity_name: str, correction: str):
        """
        Records a human-in-the-loop correction to an entity node.
        """
        # Save to fallback
        if user_id not in self._fallback_corrections:
            self._fallback_corrections[user_id] = []
        self._fallback_corrections[user_id].append(f"[{entity_name}] {correction}")

        if not self.driver:
            return

        query = """
        MERGE (u:User {id: $user_id})
        MERGE (e:Entity {name: $entity_name})
        MERGE (u)-[:CORRECTED]->(e)
        CREATE (c:Correction {text: $correction, timestamp: datetime()})
        CREATE (e)-[:HAS_CORRECTION]->(c)
        """
        try:
            with self.driver.session() as session:
                session.run(query, user_id=user_id, entity_name=entity_name, correction=correction)
        except Exception as e:
            logger.error("Failed to write correction to Neo4j: %s", e)

    def link_entity_verification(self, user_id: str, entity_name: str, status: str, attributes: Dict[str, Any]):
        """
        Creates or updates an entity verification node with attributes and links it to the user.
        """
        # Save to fallback
        if user_id not in self._fallback_entities:
            self._fallback_entities[user_id] = []
        self._fallback_entities[user_id].append({
            "name": entity_name,
            "category": attributes.get("category", "PerceptionObject"),
            "status": status,
            "attributes": attributes
        })

        if not self.driver:
            return

        query = """
        MERGE (u:User {id: $user_id})
        MERGE (e:Entity {name: $entity_name})
        SET e.category = $category, e.last_verified = datetime(), e.status = $status
        MERGE (u)-[:VERIFIED]->(e)
        """
        category = attributes.get("category", "PerceptionObject")
        try:
            with self.driver.session() as session:
                session.run(query, user_id=user_id, entity_name=entity_name, category=category, status=status)
                # Link attributes
                for key, val in attributes.items():
                    attr_query = """
                    MATCH (e:Entity {name: $entity_name})
                    MERGE (a:Attribute {key: $key, value: $val})
                    MERGE (e)-[:HAS_ATTRIBUTE]->(a)
                    """
                    session.run(attr_query, entity_name=entity_name, key=str(key), val=str(val))
        except Exception as e:
            logger.error("Failed to link entity verification in Neo4j: %s", e)
