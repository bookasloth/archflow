// Hand-authored to match supabase/migrations/0001_init.sql.
// Regenerate the canonical version later with:
//   supabase gen types typescript --linked > lib/database.types.ts
// (kept minimal: Relationships are empty; nested embeds in queries are cast at the call site.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Role = 'staff' | 'admin'
type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
type TicketType = 'task' | 'site_issue'
type Discipline =
  | 'architectural' | 'structural' | 'electrical' | 'plumbing' | 'fire_safety'
  | 'interior' | 'landscape' | 'construction' | 'documentation' | 'client_coordination'
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'
type Priority = 'low' | 'medium' | 'high' | 'critical'
type AttachmentKind = 'before' | 'after' | 'reference'
type RevisionStatus =
  | 'draft' | 'under_review' | 'approved' | 'approved_with_comments'
  | 'changes_requested' | 'rejected' | 'superseded'
type MaterialStatus = 'proposed' | 'approved' | 'rejected'
type MaterialCategory =
  | 'flooring' | 'wall_finish' | 'ceiling' | 'joinery' | 'sanitary' | 'lighting'
  | 'hardware' | 'paint' | 'glazing' | 'landscape' | 'other'
type MaterialAttachmentKind = 'photo' | 'datasheet'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: Role; created_at: string }
        Insert: { id: string; full_name?: string | null; role?: Role; created_at?: string }
        Update: { id?: string; full_name?: string | null; role?: Role; created_at?: string }
        Relationships: []
      }
      projects: {
        Row: {
          id: string; name: string; code: string | null; status: ProjectStatus
          client_name: string | null; created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; name: string; code?: string | null; status?: ProjectStatus
          client_name?: string | null; created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; name?: string; code?: string | null; status?: ProjectStatus
          client_name?: string | null; created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      buildings: {
        Row: { id: string; project_id: string; name: string }
        Insert: { id?: string; project_id: string; name: string }
        Update: { id?: string; project_id?: string; name?: string }
        Relationships: []
      }
      floors: {
        Row: { id: string; building_id: string; name: string; level_order: number }
        Insert: { id?: string; building_id: string; name: string; level_order?: number }
        Update: { id?: string; building_id?: string; name?: string; level_order?: number }
        Relationships: []
      }
      rooms: {
        Row: { id: string; floor_id: string; name: string }
        Insert: { id?: string; floor_id: string; name: string }
        Update: { id?: string; floor_id?: string; name?: string }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string; seq: number; project_id: string
          building_id: string | null; floor_id: string | null; room_id: string | null
          type: TicketType; discipline: Discipline; title: string; description: string | null
          status: TicketStatus; priority: Priority
          assignee_id: string | null; reporter_id: string; due_date: string | null; created_at: string
          drawing_id: string | null; drawing_revision_id: string | null
        }
        Insert: {
          id?: string; project_id: string
          building_id?: string | null; floor_id?: string | null; room_id?: string | null
          type: TicketType; discipline: Discipline; title: string; description?: string | null
          status?: TicketStatus; priority?: Priority
          assignee_id?: string | null; reporter_id: string; due_date?: string | null; created_at?: string
          drawing_id?: string | null; drawing_revision_id?: string | null
        }
        Update: {
          id?: string; project_id?: string
          building_id?: string | null; floor_id?: string | null; room_id?: string | null
          type?: TicketType; discipline?: Discipline; title?: string; description?: string | null
          status?: TicketStatus; priority?: Priority
          assignee_id?: string | null; reporter_id?: string; due_date?: string | null; created_at?: string
          drawing_id?: string | null; drawing_revision_id?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string; ticket_id: string; storage_path: string
          kind: AttachmentKind; uploaded_by: string | null; created_at: string
        }
        Insert: {
          id?: string; ticket_id: string; storage_path: string
          kind?: AttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; ticket_id?: string; storage_path?: string
          kind?: AttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      issue_markers: {
        Row: { id: string; attachment_id: string; x: number; y: number; label: string | null }
        Insert: { id?: string; attachment_id: string; x: number; y: number; label?: string | null }
        Update: { id?: string; attachment_id?: string; x?: number; y?: number; label?: string | null }
        Relationships: []
      }
      comments: {
        Row: { id: string; ticket_id: string; author_id: string; body: string; created_at: string }
        Insert: { id?: string; ticket_id: string; author_id: string; body: string; created_at?: string }
        Update: { id?: string; ticket_id?: string; author_id?: string; body?: string; created_at?: string }
        Relationships: []
      }
      drawings: {
        Row: {
          id: string; project_id: string; building_id: string | null; floor_id: string | null
          discipline: Discipline | null; title: string; drawing_number: string | null
          created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; project_id: string; building_id?: string | null; floor_id?: string | null
          discipline?: Discipline | null; title: string; drawing_number?: string | null
          created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; project_id?: string; building_id?: string | null; floor_id?: string | null
          discipline?: Discipline | null; title?: string; drawing_number?: string | null
          created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      drawing_revisions: {
        Row: {
          id: string; drawing_id: string; revision_no: number; storage_path: string
          status: RevisionStatus; reviewer_id: string | null; notes: string | null
          uploaded_by: string | null; decided_at: string | null; created_at: string
        }
        Insert: {
          id?: string; drawing_id: string; revision_no: number; storage_path: string
          status?: RevisionStatus; reviewer_id?: string | null; notes?: string | null
          uploaded_by?: string | null; decided_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; drawing_id?: string; revision_no?: number; storage_path?: string
          status?: RevisionStatus; reviewer_id?: string | null; notes?: string | null
          uploaded_by?: string | null; decided_at?: string | null; created_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          id: string; project_id: string; room_id: string | null; category: MaterialCategory
          name: string; manufacturer: string | null; product_code: string | null
          finish: string | null; color: string | null; size: string | null
          cost: number | null; supplier: string | null; notes: string | null
          status: MaterialStatus; decided_at: string | null; decided_by: string | null
          created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; project_id: string; room_id?: string | null; category: MaterialCategory
          name: string; manufacturer?: string | null; product_code?: string | null
          finish?: string | null; color?: string | null; size?: string | null
          cost?: number | null; supplier?: string | null; notes?: string | null
          status?: MaterialStatus; decided_at?: string | null; decided_by?: string | null
          created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; project_id?: string; room_id?: string | null; category?: MaterialCategory
          name?: string; manufacturer?: string | null; product_code?: string | null
          finish?: string | null; color?: string | null; size?: string | null
          cost?: number | null; supplier?: string | null; notes?: string | null
          status?: MaterialStatus; decided_at?: string | null; decided_by?: string | null
          created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      material_attachments: {
        Row: {
          id: string; material_id: string; storage_path: string
          kind: MaterialAttachmentKind; uploaded_by: string | null; created_at: string
        }
        Insert: {
          id?: string; material_id: string; storage_path: string
          kind?: MaterialAttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; material_id?: string; storage_path?: string
          kind?: MaterialAttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      role: Role
      project_status: ProjectStatus
      ticket_type: TicketType
      discipline: Discipline
      ticket_status: TicketStatus
      priority: Priority
      attachment_kind: AttachmentKind
      revision_status: RevisionStatus
      material_status: MaterialStatus
      material_category: MaterialCategory
      material_attachment_kind: MaterialAttachmentKind
    }
    CompositeTypes: { [_ in never]: never }
  }
}
