'use strict';

module.exports = {
  async up(queryInterface) {
    const users = [
      {
        id: 'officer-singham-001',
        username: 'Singham',
        password: '1234', // In production, hash this with bcrypt
        email: 'singham@crimematrix.com',
        name: 'Singham Kumar',
        phone: '+91-9876543210',
        region: 'North Region',
        role: 'Officer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'citizen-mokbul-001',
        username: 'Mokbul',
        password: '4567', // In production, hash this with bcrypt
        email: 'mokbul@crimematrix.com',
        name: 'Mokbul Ahmed',
        phone: '+91-9876543211',
        region: 'East Region',
        role: 'Citizen',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('Users', users, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { username: ['Singham', 'Mokbul'] }, {});
  },
};
