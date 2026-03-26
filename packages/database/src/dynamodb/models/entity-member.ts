import dynamoose from "../connection";
import { Item } from "dynamoose/dist/Item";
import { v4 as uuidv4 } from "uuid";

export enum UserRole {
  superAdmin = "superAdmin",
  admin = "admin",
  manager = "manager",
}

export type EntityMemberStatus = "active" | "invited" | "removed";

// 1. Define the TypeScript interface for EntityMember items
export interface EntityMemberTypes {
  id: string;
  userId: string;
  entityId: string;
  role?: UserRole;
  status: EntityMemberStatus;
  invitedBy?: string;
  joinedAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  roleId?: string;
}

// 2. Define the schema
const EntityMemberSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: uuidv4,
    },
    userId: {
      type: String,
      required: true,
      index: {
        name: "userIndex",
        type: "global",
      },
    },
    entityId: {
      type: String,
      required: true,
      index: {
        name: "entityIndex",
        type: "global",
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.manager,
    },
    status: {
      type: String,
      enum: ["active", "invited", "removed"],
      default: "active",
    },
    invitedBy: {
      type: String,
      required: false,
    },
    roleId: {
      type: String,
      required: false,
    },
    joinedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  },
);

// 3. Define the Item class
export class EntityMemberItem extends Item implements EntityMemberTypes {
  id!: string;
  userId!: string;
  entityId!: string;
  role?: UserRole;
  status!: EntityMemberStatus;
  invitedBy?: string;
  joinedAt!: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  roleId?: string;
}

// 4. Export the model with the correct type
export const ENTITY_MEMBER = dynamoose.model<EntityMemberItem>(
  "entityMembers",
  EntityMemberSchema,
);
