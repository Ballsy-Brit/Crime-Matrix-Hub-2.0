'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CrimeReport extends Model {
    static associate(models) {
      // Crime report is reported by a user
      this.belongsTo(models.User, { foreignKey: 'reportedById', as: 'reportedByUser' });
      // Crime report can be verified by an officer
      this.belongsTo(models.User, { foreignKey: 'verifiedById', as: 'verifiedByOfficer' });
      // Crime report can be assigned to an officer in charge
      this.belongsTo(models.User, { foreignKey: 'officerInCharge', as: 'officerAssigned' });
    }
  }

  CrimeReport.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      region: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      crimeType: {
        type: DataTypes.ENUM('Theft', 'Robbery', 'Burglary', 'Assault', 'Fraud', 'Vehicle Theft', 'Arson', 'Other'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('Pending', 'Verified', 'Closed'),
        defaultValue: 'Pending',
        allowNull: false,
      },
      reportedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      verifiedById: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      officerInCharge: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
    },
    {
      sequelize,
      modelName: 'CrimeReport',
      tableName: 'CrimeReports',
      timestamps: true,
    }
  );

  return CrimeReport;
};
