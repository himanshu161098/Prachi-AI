import { db } from '../database';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
  email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CallActionResult {
  status: 'found' | 'not_found' | 'invalid';
  contact?: Contact;
  contactName: string;
  phone: string;
  target: string;
  message: string;
}

export interface MessageActionResult {
  status: 'found' | 'not_found' | 'invalid';
  contact?: Contact;
  contactName: string;
  phone: string;
  platform: 'whatsapp' | 'sms';
  target: string;
  messageText: string;
  message: string;
}

export class ContactService {
  /**
   * Retrieves all contacts for the specified user (Tenant Isolated).
   */
  public static getUserContacts(userId: string, search?: string): Contact[] {
    const rows = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(userId) as Contact[];
    if (!search || !search.trim()) return rows;
    const lowerSearch = search.trim().toLowerCase();
    return rows.filter(c =>
      (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
      (c.relationship && c.relationship.toLowerCase().includes(lowerSearch)) ||
      (c.phone && c.phone.includes(lowerSearch)) ||
      (c.email && c.email.toLowerCase().includes(lowerSearch))
    );
  }

  /**
   * Finds a single contact matching a query (Name, Relationship, Phone).
   */
  public static findContact(userId: string, query: string): Contact | undefined {
    const contacts = this.getUserContacts(userId);
    if (!query) return undefined;
    const lower = query.trim().toLowerCase();

    // 1. Direct phone number matching
    const digitsOnly = lower.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 7) {
      const byPhone = contacts.find(c => c.phone && c.phone.replace(/[^0-9]/g, '').includes(digitsOnly));
      if (byPhone) return byPhone;
    }

    // 2. Exact name match
    const exactName = contacts.find(c => c.name && c.name.toLowerCase() === lower);
    if (exactName) return exactName;

    // 3. Exact relationship match (e.g. Papa, Mummy, Boss, Brother, Sister)
    const exactRel = contacts.find(c => c.relationship && c.relationship.toLowerCase() === lower);
    if (exactRel) return exactRel;

    // 4. Substring in relationship
    const subRel = contacts.find(c => c.relationship && c.relationship.toLowerCase().includes(lower));
    if (subRel) return subRel;

    // 5. Name starts with or contains query (e.g. "Rahul" -> "Rahul Sharma")
    const subName = contacts.find(c => c.name && c.name.toLowerCase().includes(lower));
    if (subName) return subName;

    // 6. Common Hindi / Hinglish aliases
    if (/^(papa|pitaji|father|dad|daddy)$/i.test(lower)) {
      const dad = contacts.find(c => /papa|father|dad|pitaji/i.test(c.name + ' ' + (c.relationship || '')));
      if (dad) return dad;
    }

    if (/^(mummy|maa|mom|mother|mataji|ammi)$/i.test(lower)) {
      const mom = contacts.find(c => /mummy|mom|maa|mother|mataji|ammi/i.test(c.name + ' ' + (c.relationship || '')));
      if (mom) return mom;
    }

    if (/^(bhai|brother|bhaiya|bro)$/i.test(lower)) {
      const bro = contacts.find(c => /brother|bhai|bhaiya/i.test(c.name + ' ' + (c.relationship || '')));
      if (bro) return bro;
    }

    if (/^(behen|sister|didi|sis)$/i.test(lower)) {
      const sis = contacts.find(c => /sister|behen|didi/i.test(c.name + ' ' + (c.relationship || '')));
      if (sis) return sis;
    }

    return undefined;
  }

  /**
   * Adds or updates a contact for the user.
   */
  public static addContact(userId: string, data: {
    name: string;
    phone: string;
    relationship?: string;
    email?: string;
    notes?: string;
  }): Contact {
    const contactId = `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newContact: Contact = {
      id: contactId,
      user_id: userId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      relationship: data.relationship ? data.relationship.trim() : undefined,
      email: data.email ? data.email.trim() : undefined,
      notes: data.notes ? data.notes.trim() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO contacts (id, user_id, name, phone, relationship, email, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContact.id,
      newContact.user_id,
      newContact.name,
      newContact.phone,
      newContact.relationship || null,
      newContact.email || null,
      newContact.notes || null
    );

    return newContact;
  }

  /**
   * Deletes a contact for the user.
   */
  public static deleteContact(userId: string, contactId: string): boolean {
    const res = db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(contactId, userId);
    return res.changes > 0;
  }

  /**
   * Bulk syncs contacts from device.
   */
  public static syncContacts(userId: string, contacts: Array<{ name: string; phone: string; email?: string }>): { added: number } {
    let added = 0;
    for (const c of contacts) {
      if (!c.name || !c.phone) continue;
      const existing = this.findContact(userId, c.name);
      if (!existing) {
        this.addContact(userId, { name: c.name, phone: c.phone, email: c.email });
        added++;
      }
    }
    return { added };
  }

  /**
   * Resolves a Call request.
   */
  public static resolveCall(userId: string, targetNameOrNumber: string): CallActionResult {
    const cleanTarget = targetNameOrNumber.trim();
    // Check if target itself is already a direct 10-13 digit phone number
    const isDirectNumber = /^(\+?[0-9]{10,13})$/.test(cleanTarget.replace(/[\s\-]/g, ''));
    if (isDirectNumber) {
      const phone = cleanTarget;
      return {
        status: 'found',
        contactName: phone,
        phone,
        target: `tel:${phone}`,
        message: `Calling ${phone}`
      };
    }

    const contact = this.findContact(userId, cleanTarget);
    if (contact && contact.phone) {
      return {
        status: 'found',
        contact,
        contactName: contact.name,
        phone: contact.phone,
        target: `tel:${contact.phone}`,
        message: `Calling ${contact.name} (${contact.phone})`
      };
    }

    return {
      status: 'not_found',
      contactName: cleanTarget,
      phone: '',
      target: '',
      message: `Contact "${cleanTarget}" not found in your phonebook.`
    };
  }

  /**
   * Resolves a Message request (WhatsApp or SMS).
   */
  public static resolveMessage(
    userId: string,
    targetNameOrNumber: string,
    messageContent: string,
    requestedPlatform?: 'whatsapp' | 'sms'
  ): MessageActionResult {
    const cleanTarget = targetNameOrNumber.trim();
    const isDirectNumber = /^(\+?[0-9]{10,13})$/.test(cleanTarget.replace(/[\s\-]/g, ''));

    let phone = '';
    let contactName = cleanTarget;
    let contact: Contact | undefined;

    if (isDirectNumber) {
      phone = cleanTarget;
    } else {
      contact = this.findContact(userId, cleanTarget);
      if (contact && contact.phone) {
        phone = contact.phone;
        contactName = contact.name;
      }
    }

    if (!phone) {
      return {
        status: 'not_found',
        contactName: cleanTarget,
        phone: '',
        platform: requestedPlatform || 'whatsapp',
        target: '',
        messageText: messageContent,
        message: `Contact "${cleanTarget}" not found in your phonebook.`
      };
    }

    // Format phone for WhatsApp: needs country code without leading '+'
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const waNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const platform = requestedPlatform || 'whatsapp';

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(messageContent)}`;
    const smsUrl = `sms:${cleanDigits}?body=${encodeURIComponent(messageContent)}`;

    const targetUrl = platform === 'sms' ? smsUrl : waUrl;

    return {
      status: 'found',
      contact,
      contactName,
      phone,
      platform,
      target: targetUrl,
      messageText: messageContent,
      message: `Sending ${platform.toUpperCase()} message to ${contactName} (${phone}): "${messageContent}"`
    };
  }
}
