'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User can report crimes
      this.hasMany(models.CrimeReport, { foreignKey: 'reportedById', as: 'reportsSubmitted' });
      // Officer can verify crimes
      this.hasMany(models.CrimeReport, { foreignKey: 'verifiedById', as: 'reportsVerified' });
      // Officer can be assigned to crimes
      this.hasMany(models.CrimeReport, { foreignKey: 'officerInCharge', as: 'assignedCases' });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      photoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('Officer', 'Citizen', 'Admin'),
        allowNull: false,
        defaultValue: 'Citizen',
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      adminId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      adminSignupDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
    }
  );

  return User;
};
