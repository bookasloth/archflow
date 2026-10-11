export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          id: string
          name: string
          project_id: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profile: {
        Row: {
          accent_color: string
          address: string | null
          bank_details: string | null
          city: string | null
          country: string
          default_due_days: number
          default_notes: string | null
          default_tax_mode: Database["public"]["Enums"]["invoice_tax_mode"]
          default_tax_rate: number
          default_terms: string | null
          email: string | null
          firm_name: string
          footer_note: string | null
          gst_registered: boolean
          gstin: string | null
          id: boolean
          invoice_prefix: string
          logo_data: string | null
          number_by_fy: boolean
          pan: string | null
          phone: string | null
          pin: string | null
          principal_name: string | null
          proforma_prefix: string
          registration: string | null
          signature_data: string | null
          state: string | null
          template: string
          updated_at: string
          updated_by: string | null
          upi_id: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          bank_details?: string | null
          city?: string | null
          country?: string
          default_due_days?: number
          default_notes?: string | null
          default_tax_mode?: Database["public"]["Enums"]["invoice_tax_mode"]
          default_tax_rate?: number
          default_terms?: string | null
          email?: string | null
          firm_name: string
          footer_note?: string | null
          gst_registered?: boolean
          gstin?: string | null
          id?: boolean
          invoice_prefix?: string
          logo_data?: string | null
          number_by_fy?: boolean
          pan?: string | null
          phone?: string | null
          pin?: string | null
          principal_name?: string | null
          proforma_prefix?: string
          registration?: string | null
          signature_data?: string | null
          state?: string | null
          template?: string
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          bank_details?: string | null
          city?: string | null
          country?: string
          default_due_days?: number
          default_notes?: string | null
          default_tax_mode?: Database["public"]["Enums"]["invoice_tax_mode"]
          default_tax_rate?: number
          default_terms?: string | null
          email?: string | null
          firm_name?: string
          footer_note?: string | null
          gst_registered?: boolean
          gstin?: string | null
          id?: boolean
          invoice_prefix?: string
          logo_data?: string | null
          number_by_fy?: boolean
          pan?: string | null
          phone?: string | null
          pin?: string | null
          principal_name?: string | null
          proforma_prefix?: string
          registration?: string | null
          signature_data?: string | null
          state?: string | null
          template?: string
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profile_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pin: string | null
          site_address: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pin?: string | null
          site_address?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pin?: string | null
          site_address?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          project_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_revisions: {
        Row: {
          created_at: string
          decided_at: string | null
          drawing_id: string
          id: string
          notes: string | null
          reviewer_id: string | null
          revision_no: number
          status: Database["public"]["Enums"]["revision_status"]
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          drawing_id: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          revision_no: number
          status?: Database["public"]["Enums"]["revision_status"]
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          drawing_id?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          revision_no?: number
          status?: Database["public"]["Enums"]["revision_status"]
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          building_id: string | null
          created_at: string
          created_by: string | null
          discipline: Database["public"]["Enums"]["discipline"] | null
          drawing_number: string | null
          floor_id: string | null
          id: string
          project_id: string
          title: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: Database["public"]["Enums"]["discipline"] | null
          drawing_number?: string | null
          floor_id?: string | null
          id?: string
          project_id: string
          title: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: Database["public"]["Enums"]["discipline"] | null
          drawing_number?: string | null
          floor_id?: string | null
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          id: string
          level_order: number
          name: string
        }
        Insert: {
          building_id: string
          id?: string
          level_order?: number
          name: string
        }
        Update: {
          building_id?: string
          id?: string
          level_order?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_events: {
        Row: {
          actor: string | null
          at: string
          detail: Json | null
          id: number
          invoice_id: string
          kind: string
        }
        Insert: {
          actor?: string | null
          at?: string
          detail?: Json | null
          id?: never
          invoice_id: string
          kind: string
        }
        Update: {
          actor?: string | null
          at?: string
          detail?: Json | null
          id?: never
          invoice_id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          category: string | null
          description: string
          discount_kind:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_value: number
          id: string
          invoice_id: string
          position: number
          qty: number
          rate: number
          tax: number
          tax_rate: number
          taxable: number
          total: number
          unit: string | null
        }
        Insert: {
          category?: string | null
          description: string
          discount_kind?:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_value?: number
          id?: string
          invoice_id: string
          position: number
          qty: number
          rate: number
          tax?: number
          tax_rate?: number
          taxable?: number
          total?: number
          unit?: string | null
        }
        Update: {
          category?: string | null
          description?: string
          discount_kind?:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_value?: number
          id?: string
          invoice_id?: string
          position?: number
          qty?: number
          rate?: number
          tax?: number
          tax_rate?: number
          taxable?: number
          total?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["invoice_payment_method"]
          notes: string | null
          paid_on: string
          reference: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["invoice_payment_method"]
          notes?: string | null
          paid_on: string
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["invoice_payment_method"]
          notes?: string | null
          paid_on?: string
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          fy: string
          next_no: number
          prefix: string
        }
        Insert: {
          fy?: string
          next_no?: number
          prefix: string
        }
        Update: {
          fy?: string
          next_no?: number
          prefix?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          accent_color: string | null
          advance_adjusted: number
          buyer: Json | null
          cancel_reason: string | null
          cancelled_at: string | null
          cgst_total: number
          client_id: string
          created_at: string
          created_by: string | null
          discount_kind:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_total: number
          discount_value: number
          doc_type: Database["public"]["Enums"]["invoice_doc_type"]
          due_date: string | null
          duplicated_from: string | null
          fy: string | null
          id: string
          igst_total: number
          invoice_date: string
          issued_at: string | null
          notes: string | null
          number: string | null
          payable: number
          payment_instructions: string | null
          place_of_supply: string | null
          po_reference: string | null
          prefix: string | null
          project_id: string | null
          project_snapshot: Json | null
          retention: number
          round_off: boolean
          round_off_amount: number
          seller: Json | null
          seq: number | null
          sgst_total: number
          share_token: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_mode: Database["public"]["Enums"]["invoice_tax_mode"]
          tax_total: number
          taxable_total: number
          template: string
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          advance_adjusted?: number
          buyer?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cgst_total?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          discount_kind?:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_total?: number
          discount_value?: number
          doc_type?: Database["public"]["Enums"]["invoice_doc_type"]
          due_date?: string | null
          duplicated_from?: string | null
          fy?: string | null
          id?: string
          igst_total?: number
          invoice_date?: string
          issued_at?: string | null
          notes?: string | null
          number?: string | null
          payable?: number
          payment_instructions?: string | null
          place_of_supply?: string | null
          po_reference?: string | null
          prefix?: string | null
          project_id?: string | null
          project_snapshot?: Json | null
          retention?: number
          round_off?: boolean
          round_off_amount?: number
          seller?: Json | null
          seq?: number | null
          sgst_total?: number
          share_token?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_mode?: Database["public"]["Enums"]["invoice_tax_mode"]
          tax_total?: number
          taxable_total?: number
          template?: string
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          advance_adjusted?: number
          buyer?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cgst_total?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          discount_kind?:
            | Database["public"]["Enums"]["invoice_discount_kind"]
            | null
          discount_total?: number
          discount_value?: number
          doc_type?: Database["public"]["Enums"]["invoice_doc_type"]
          due_date?: string | null
          duplicated_from?: string | null
          fy?: string | null
          id?: string
          igst_total?: number
          invoice_date?: string
          issued_at?: string | null
          notes?: string | null
          number?: string | null
          payable?: number
          payment_instructions?: string | null
          place_of_supply?: string | null
          po_reference?: string | null
          prefix?: string | null
          project_id?: string | null
          project_snapshot?: Json | null
          retention?: number
          round_off?: boolean
          round_off_amount?: number
          seller?: Json | null
          seq?: number | null
          sgst_total?: number
          share_token?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_mode?: Database["public"]["Enums"]["invoice_tax_mode"]
          tax_total?: number
          taxable_total?: number
          template?: string
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_duplicated_from_fkey"
            columns: ["duplicated_from"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_markers: {
        Row: {
          attachment_id: string
          id: string
          label: string | null
          x: number
          y: number
        }
        Insert: {
          attachment_id: string
          id?: string
          label?: string | null
          x: number
          y: number
        }
        Update: {
          attachment_id?: string
          id?: string
          label?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "issue_markers_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      material_attachments: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["material_attachment_kind"]
          material_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["material_attachment_kind"]
          material_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["material_attachment_kind"]
          material_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_attachments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: Database["public"]["Enums"]["material_category"]
          color: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          drawing_id: string | null
          finish: string | null
          id: string
          manufacturer: string | null
          name: string
          notes: string | null
          product_code: string | null
          project_id: string
          room_id: string | null
          size: string | null
          status: Database["public"]["Enums"]["material_status"]
          supplier: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["material_category"]
          color?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          drawing_id?: string | null
          finish?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          notes?: string | null
          product_code?: string | null
          project_id: string
          room_id?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          supplier?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["material_category"]
          color?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          drawing_id?: string | null
          finish?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          notes?: string | null
          product_code?: string | null
          project_id?: string
          room_id?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role"]
        }
        Relationships: []
      }
      project_billing: {
        Row: {
          agreed_fee: number | null
          billing_method: string | null
          client_id: string | null
          contract_value: number | null
          description: string | null
          end_date: string | null
          location: string | null
          notes: string | null
          project_id: string
          project_type: string | null
          reference: string | null
          site_state: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          agreed_fee?: number | null
          billing_method?: string | null
          client_id?: string | null
          contract_value?: number | null
          description?: string | null
          end_date?: string | null
          location?: string | null
          notes?: string | null
          project_id: string
          project_type?: string | null
          reference?: string | null
          site_state?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          agreed_fee?: number | null
          billing_method?: string | null
          client_id?: string | null
          contract_value?: number | null
          description?: string | null
          end_date?: string | null
          location?: string | null
          notes?: string | null
          project_id?: string
          project_type?: string | null
          reference?: string | null
          site_state?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_billing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_billing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          client_name?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          client_name?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed: {
        Row: {
          entity_id: string
          entity_type: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          floor_id: string
          id: string
          name: string
        }
        Insert: {
          floor_id: string
          id?: string
          name: string
        }
        Update: {
          floor_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_tags: {
        Row: {
          tag_id: string
          ticket_id: string
        }
        Insert: {
          tag_id: string
          ticket_id: string
        }
        Update: {
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_id: string | null
          building_id: string | null
          created_at: string
          description: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          drawing_id: string | null
          drawing_revision_id: string | null
          due_date: string | null
          floor_id: string | null
          id: string
          material_id: string | null
          parent_id: string | null
          priority: Database["public"]["Enums"]["priority"]
          project_id: string
          reporter_id: string
          room_id: string | null
          seq: number
          start_date: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
        }
        Insert: {
          assignee_id?: string | null
          building_id?: string | null
          created_at?: string
          description?: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          drawing_id?: string | null
          drawing_revision_id?: string | null
          due_date?: string | null
          floor_id?: string | null
          id?: string
          material_id?: string | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id: string
          reporter_id: string
          room_id?: string | null
          seq?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
        }
        Update: {
          assignee_id?: string | null
          building_id?: string | null
          created_at?: string
          description?: string | null
          discipline?: Database["public"]["Enums"]["discipline"]
          drawing_id?: string | null
          drawing_revision_id?: string | null
          due_date?: string | null
          floor_id?: string | null
          id?: string
          material_id?: string | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string
          reporter_id?: string
          room_id?: string | null
          seq?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_drawing_revision_id_fkey"
            columns: ["drawing_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_invoice: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      format_invoice_number: {
        Args: { fy: string; n: number; p: string }
        Returns: string
      }
      get_shared_invoice: { Args: { p_token: string }; Returns: Json }
      invoice_fy: { Args: { d: string }; Returns: string }
      is_admin: { Args: { uid: string }; Returns: boolean }
      issue_invoice: { Args: { p_id: string }; Returns: string }
      record_payment: {
        Args: {
          p_amount: number
          p_invoice: string
          p_method: Database["public"]["Enums"]["invoice_payment_method"]
          p_notes?: string
          p_paid_on: string
          p_reference?: string
        }
        Returns: string
      }
      replace_invoice_lines: {
        Args: { p_invoice: string; p_lines: Json }
        Returns: undefined
      }
      void_payment: {
        Args: { p_payment: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      attachment_kind: "before" | "after" | "reference"
      discipline:
        | "architectural"
        | "structural"
        | "electrical"
        | "plumbing"
        | "fire_safety"
        | "interior"
        | "landscape"
        | "construction"
        | "documentation"
        | "client_coordination"
      invoice_discount_kind: "percent" | "fixed"
      invoice_doc_type:
        | "tax_invoice"
        | "invoice"
        | "bill_of_supply"
        | "proforma"
      invoice_payment_method:
        | "upi"
        | "bank_transfer"
        | "cash"
        | "cheque"
        | "card"
        | "other"
      invoice_status: "draft" | "issued" | "cancelled"
      invoice_tax_mode: "exclusive" | "inclusive"
      material_attachment_kind: "photo" | "datasheet"
      material_category:
        | "flooring"
        | "wall_finish"
        | "ceiling"
        | "joinery"
        | "sanitary"
        | "lighting"
        | "hardware"
        | "paint"
        | "glazing"
        | "landscape"
        | "other"
      material_status: "proposed" | "approved" | "rejected"
      priority: "low" | "medium" | "high" | "critical"
      project_status: "active" | "on_hold" | "completed" | "archived"
      revision_status:
        | "draft"
        | "under_review"
        | "approved"
        | "approved_with_comments"
        | "changes_requested"
        | "rejected"
        | "superseded"
      role: "staff" | "admin"
      ticket_status: "open" | "in_progress" | "resolved" | "verified" | "closed"
      ticket_type: "task" | "site_issue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attachment_kind: ["before", "after", "reference"],
      discipline: [
        "architectural",
        "structural",
        "electrical",
        "plumbing",
        "fire_safety",
        "interior",
        "landscape",
        "construction",
        "documentation",
        "client_coordination",
      ],
      invoice_discount_kind: ["percent", "fixed"],
      invoice_doc_type: [
        "tax_invoice",
        "invoice",
        "bill_of_supply",
        "proforma",
      ],
      invoice_payment_method: [
        "upi",
        "bank_transfer",
        "cash",
        "cheque",
        "card",
        "other",
      ],
      invoice_status: ["draft", "issued", "cancelled"],
      invoice_tax_mode: ["exclusive", "inclusive"],
      material_attachment_kind: ["photo", "datasheet"],
      material_category: [
        "flooring",
        "wall_finish",
        "ceiling",
        "joinery",
        "sanitary",
        "lighting",
        "hardware",
        "paint",
        "glazing",
        "landscape",
        "other",
      ],
      material_status: ["proposed", "approved", "rejected"],
      priority: ["low", "medium", "high", "critical"],
      project_status: ["active", "on_hold", "completed", "archived"],
      revision_status: [
        "draft",
        "under_review",
        "approved",
        "approved_with_comments",
        "changes_requested",
        "rejected",
        "superseded",
      ],
      role: ["staff", "admin"],
      ticket_status: ["open", "in_progress", "resolved", "verified", "closed"],
      ticket_type: ["task", "site_issue"],
    },
  },
} as const

