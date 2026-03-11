'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add photoUrl column to Users table
    await queryInterface.addColumn('Users', 'photoUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove photoUrl column
    await queryInterface.removeColumn('Users', 'photoUrl');
  }
};
