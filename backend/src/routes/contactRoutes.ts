import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { ContactService } from '../services/contactService';

export const contactRouter = Router();

// List contacts for authenticated user
contactRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const contacts = ContactService.getUserContacts(req.user!.id, search);
  res.json({ contacts, data: contacts, count: contacts.length });
});

// Add a single contact
contactRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { name, phone, relationship, email, notes } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: 'BadRequest', message: 'Name and phone number are required.' });
    return;
  }

  const contact = ContactService.addContact(req.user!.id, {
    name,
    phone,
    relationship,
    email,
    notes
  });

  res.status(201).json({ status: 'created', contact });
});

// Delete a contact
contactRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const success = ContactService.deleteContact(req.user!.id, req.params.id);
  if (!success) {
    res.status(404).json({ error: 'NotFound', message: 'Contact not found or access denied.' });
    return;
  }
  res.json({ status: 'deleted', id: req.params.id });
});

// Bulk sync contacts
contactRouter.post('/sync', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) {
    res.status(400).json({ error: 'BadRequest', message: 'contacts array is required.' });
    return;
  }

  const result = ContactService.syncContacts(req.user!.id, contacts);
  res.json({ status: 'synced', ...result });
});

// Call resolve
contactRouter.post('/call', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { recipient } = req.body;
  if (!recipient) {
    res.status(400).json({ error: 'BadRequest', message: 'Recipient name or phone number is required.' });
    return;
  }

  const result = ContactService.resolveCall(req.user!.id, recipient);
  res.json(result);
});

// Message resolve
contactRouter.post('/message', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { recipient, message, platform } = req.body;
  if (!recipient || !message) {
    res.status(400).json({ error: 'BadRequest', message: 'Recipient and message text are required.' });
    return;
  }

  const result = ContactService.resolveMessage(req.user!.id, recipient, message, platform);
  res.json(result);
});
