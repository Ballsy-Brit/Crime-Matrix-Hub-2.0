'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('Officer', 'Citizen', 'Admin'),
      allowNull: false,
      defaultValue: 'Citizen',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('Officer', 'Citizen'),
      allowNull: false,
      defaultValue: 'Citizen',
    });
  },
};


