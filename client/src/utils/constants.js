export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const SERVICE_TYPES = [
  'Marriage',
  'Funeral',
  'Baptism',
  'Mass Intention',
  'Private Mass',
];

// Admin can replace image URLs below to customize landing page service cards.
export const SERVICE_CARDS = [
  {
    name: 'Marriage',
    image:
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    description: 'Celebrate a sacramental union in a solemn and prayerful parish setting.',
  },
  {
    name: 'Funeral',
    image:
      'https://images.unsplash.com/photo-1475070929565-c985b496cb9f?auto=format&fit=crop&w=1200&q=80',
    description: 'Book a respectful liturgical service for final commendation and prayer.',
  },
  {
    name: 'Baptism',
    image:
      'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?auto=format&fit=crop&w=1200&q=80',
    description: 'Welcome children into the faith through scheduled parish baptism rites.',
  },
  {
    name: 'Mass Intention',
    image:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    description: 'Offer prayer intentions during Mass for thanksgiving or special petitions.',
  },
  {
    name: 'Private Mass',
    image:
      'https://images.unsplash.com/photo-1548625149-720134d51a3a?auto=format&fit=crop&w=1200&q=80',
    description: 'Request a private Mass for family milestones and meaningful occasions.',
  },
];

// Admin can replace image URLs below to customize landing page core feature cards.
export const CORE_FEATURE_CARDS = [
  {
    name: 'Register & Login',
    image:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
    description: 'Secure account access for parishioners and staff with streamlined authentication.',
  },
  {
    name: 'Reservations',
    image:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
    description: 'Reserve parish services online using schedule-aware and availability-based booking.',
  },
  {
    name: 'Appointments',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    description: 'Coordinate office visits and pastoral meetings with organized time management.',
  },
  {
    name: 'Centralized Records',
    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    description: 'Maintain a reliable and searchable digital archive for sacramental records.',
  },
];

export const SERVICE_LABELS = {
  Marriage: 'Wedding',
  Funeral: 'Funeral',
  Baptism: 'Baptism',
  'Mass Intention': 'Mass Intention',
  'Private Mass': 'Private Mass',
};

/** Holy Family Parish — single venue availability for parishioner reservations */
export const SERVICE_SCHEDULE = {
  Baptism: 'Wednesday and Saturday only — 10:00 AM only',
  Marriage: 'Except Tuesday and Sunday — 9:00 AM and 2:00 PM only',
  Funeral: 'Except Tuesday and Sunday — 9:00 AM and 2:00 PM only',
  'Private Mass': 'Monday and Wednesday-Saturday, 8:00 AM-12:00 PM or 1:00 PM-4:00 PM',
  'Mass Intention':
    'Monday 6:00 AM; Tuesday closed; Wednesday 6:00 AM; Thursday 6:00 AM; Friday 6:00 AM; Saturday 6:00 AM; Sunday 6:00 AM and 8:00 AM',
};

export const SERVICE_REQUIREMENTS = {
  Marriage: 'Marriage License, Baptismal Certificate, Confirmation Certificate, Pre-Cana Seminar Certificate',
  Funeral: 'Death Certificate, Baptismal Certificate of deceased, Family contact information',
  Baptism: 'Birth Certificate, Parents Marriage Certificate, Godparents Confirmation Certificates',
  'Mass Intention': 'Payment receipt / proof of payment',
  'Private Mass': 'Purpose of Mass, Expected attendees, Preferred priest (if any)',
};

export const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

export const PARISH_LOCATION = {
  name: 'Holy Family Parish',
  address: 'Putiao, Pilar, Sorsogon, Philippines',
};

export const STATUS_BADGE = {
  Pending: 'badge-pending',
  'Under Review': 'badge-pending',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected',
  Completed: 'badge-completed',
  Cancelled: 'badge-rejected',
};
