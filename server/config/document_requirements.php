<?php

/**
 * Document Requirements Configuration
 * 
 * Single source of truth for document requirements per reservation service type.
 * Future changes to document requirements should only require editing this file.
 * 
 * Structure:
 * - Service Type (key) => Array of required documents
 * - Each document has:
 *   - name: Human-readable display name
 *   - required: Boolean (true = mandatory, false = optional)
 *   - type: Unique identifier for database storage
 */

return [
    'Baptism' => [
        [
            'name' => 'Birth Certificate',
            'required' => true,
            'type' => 'birth_certificate',
        ],
        [
            'name' => 'Parent Valid ID',
            'required' => true,
            'type' => 'parent_valid_id',
        ],
    ],

    'Marriage' => [
        [
            'name' => 'Marriage License',
            'required' => true,
            'type' => 'marriage_license',
        ],
        [
            'name' => 'Baptismal Certificate',
            'required' => true,
            'type' => 'baptismal_certificate',
        ],
        [
            'name' => 'Confirmation Certificate',
            'required' => true,
            'type' => 'confirmation_certificate',
        ],
        [
            'name' => 'Couple Valid IDs',
            'required' => true,
            'type' => 'couple_valid_ids',
        ],
        [
            'name' => 'Pre-Cana Seminar Certificate',
            'required' => true,
            'type' => 'pre_cana_certificate',
        ],
    ],

    'Funeral' => [
        [
            'name' => 'Death Certificate',
            'required' => true,
            'type' => 'death_certificate',
        ],
        [
            'name' => 'Funeral Permit',
            'required' => true,
            'type' => 'funeral_permit',
        ],
        [
            'name' => 'Valid ID of Requester',
            'required' => true,
            'type' => 'requester_valid_id',
        ],
        [
            'name' => 'Baptismal Certificate of Deceased',
            'required' => false,
            'type' => 'deceased_baptismal_certificate',
        ],
    ],

    'Mass Intention' => [
        [
            'name' => 'Intention Form',
            'required' => false,
            'type' => 'intention_form',
        ],
        [
            'name' => 'Valid ID',
            'required' => false,
            'type' => 'valid_id',
        ],
    ],

    'Private Mass' => [
        [
            'name' => 'Valid ID',
            'required' => true,
            'type' => 'valid_id',
        ],
        [
            'name' => 'Event Details Document',
            'required' => false,
            'type' => 'event_details',
        ],
    ],
];
