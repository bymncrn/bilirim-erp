export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_txns: {
        Row: {
          account_id: string
          amount: number
          category: string
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          instrument_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          company_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          instrument_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          instrument_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_txns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_txns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity: string
          id: string
          summary: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity?: string
          id?: string
          summary?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity?: string
          id?: string
          summary?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cariler: {
        Row: {
          address: string
          balance: number
          company_id: string
          created_at: string
          currency: string
          email: string
          id: string
          name: string
          note: string
          opening_balance: number
          phone: string
          tax_no: string
          tax_office: string
          type: string
        }
        Insert: {
          address: string
          balance: number
          company_id: string
          created_at?: string
          currency?: string
          email: string
          id?: string
          name: string
          note: string
          opening_balance: number
          phone: string
          tax_no: string
          tax_office: string
          type: string
        }
        Update: {
          address?: string
          balance?: number
          company_id?: string
          created_at?: string
          currency?: string
          email?: string
          id?: string
          name?: string
          note?: string
          opening_balance?: number
          phone?: string
          tax_no?: string
          tax_office?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cariler_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_entries: {
        Row: {
          account_name: string
          amount: number
          company_id: string
          created_at: string
          description: string
          id: string
          occurred_at: string
          source: string
        }
        Insert: {
          account_name?: string
          amount?: number
          company_id: string
          created_at?: string
          description?: string
          id?: string
          occurred_at?: string
          source?: string
        }
        Update: {
          account_name?: string
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          occurred_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          default_currency: string
          default_vat: number
          edoc_credits: number
          einvoice_alias: string
          einvoice_password: string
          einvoice_username: string
          email: string | null
          id: string
          invoice_footer: string
          logo_url: string | null
          modules: string[]
          name: string
          notification_emails: string[]
          notifications_enabled: boolean
          notify_invoice: boolean
          notify_payment: boolean
          notify_service_new: boolean
          notify_service_update: boolean
          onboarding_module: string | null
          pdks_plan: string
          phone: string | null
          plan: string
          primary_color: string
          quote_terms_default: string
          signature_enabled: boolean
          smtp_from: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_tls: boolean
          smtp_user: string
          subscription_ends_at: string | null
          tax_no: string | null
          tax_office: string | null
          trial_ends_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_currency?: string
          default_vat?: number
          edoc_credits?: number
          einvoice_alias?: string
          einvoice_password?: string
          einvoice_username?: string
          email?: string | null
          id?: string
          invoice_footer?: string
          logo_url?: string | null
          modules?: string[]
          name: string
          notification_emails?: string[]
          notifications_enabled?: boolean
          notify_invoice?: boolean
          notify_payment?: boolean
          notify_service_new?: boolean
          notify_service_update?: boolean
          onboarding_module?: string | null
          pdks_plan?: string
          phone?: string | null
          plan?: string
          primary_color?: string
          quote_terms_default?: string
          signature_enabled?: boolean
          smtp_from?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_tls?: boolean
          smtp_user?: string
          subscription_ends_at?: string | null
          tax_no?: string | null
          tax_office?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          default_currency?: string
          default_vat?: number
          edoc_credits?: number
          einvoice_alias?: string
          einvoice_password?: string
          einvoice_username?: string
          email?: string | null
          id?: string
          invoice_footer?: string
          logo_url?: string | null
          modules?: string[]
          name?: string
          notification_emails?: string[]
          notifications_enabled?: boolean
          notify_invoice?: boolean
          notify_payment?: boolean
          notify_service_new?: boolean
          notify_service_update?: boolean
          onboarding_module?: string | null
          pdks_plan?: string
          phone?: string | null
          plan?: string
          primary_color?: string
          quote_terms_default?: string
          signature_enabled?: boolean
          smtp_from?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_tls?: boolean
          smtp_user?: string
          subscription_ends_at?: string | null
          tax_no?: string | null
          tax_office?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      counters: {
        Row: {
          company_id: string
          id: number
          kind: string
          seq: number
          year: number
        }
        Insert: {
          company_id: string
          id?: number
          kind: string
          seq: number
          year: number
        }
        Update: {
          company_id?: string
          id?: number
          kind?: string
          seq?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dayend_reports: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payload: Json
          report_date: string
          total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          report_date?: string
          total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          report_date?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "dayend_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dining_tables: {
        Row: {
          area: string
          company_id: string
          created_at: string
          id: string
          name: string
          opened_at: string | null
          status: string
          waiter: string
        }
        Insert: {
          area?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          opened_at?: string | null
          status?: string
          waiter?: string
        }
        Update: {
          area?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          opened_at?: string | null
          status?: string
          waiter?: string
        }
        Relationships: [
          {
            foreignKeyName: "dining_tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      e_documents: {
        Row: {
          account_name: string
          base: number
          buyer_city: string
          buyer_district: string
          buyer_tax_no: string
          buyer_tax_office: string
          company_id: string
          created_at: string
          currency: string
          direction: string
          doc_date: string
          id: string
          invoice_type: string
          kind: string
          lines: Json
          no: string
          scenario: string
          status: string
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          account_name?: string
          base?: number
          buyer_city?: string
          buyer_district?: string
          buyer_tax_no?: string
          buyer_tax_office?: string
          company_id: string
          created_at?: string
          currency?: string
          direction: string
          doc_date?: string
          id?: string
          invoice_type?: string
          kind: string
          lines?: Json
          no: string
          scenario?: string
          status?: string
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          account_name?: string
          base?: number
          buyer_city?: string
          buyer_district?: string
          buyer_tax_no?: string
          buyer_tax_office?: string
          company_id?: string
          created_at?: string
          currency?: string
          direction?: string
          doc_date?: string
          id?: string
          invoice_type?: string
          kind?: string
          lines?: Json
          no?: string
          scenario?: string
          status?: string
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "e_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          department: string
          email: string
          hire_date: string | null
          id: string
          name: string
          note: string
          phone: string
          position: string
          salary: number
        }
        Insert: {
          active: boolean
          company_id: string
          created_at?: string
          department: string
          email: string
          hire_date?: string | null
          id?: string
          name: string
          note: string
          phone: string
          position: string
          salary: number
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          department?: string
          email?: string
          hire_date?: string | null
          id?: string
          name?: string
          note?: string
          phone?: string
          position?: string
          salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_name: string
          amount: number
          category: string
          company_id: string
          created_at: string
          expense_date: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          account_name?: string
          amount?: number
          category?: string
          company_id: string
          created_at?: string
          expense_date?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          expense_date?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          active: boolean
          balance: number
          bank_name: string
          company_id: string
          created_at: string
          currency: string
          iban: string
          id: string
          last4: string
          limit: number
          name: string
          note: string
          opening_balance: number
          type: string
        }
        Insert: {
          active: boolean
          balance: number
          bank_name: string
          company_id: string
          created_at?: string
          currency: string
          iban: string
          id?: string
          last4: string
          limit: number
          name: string
          note: string
          opening_balance: number
          type: string
        }
        Update: {
          active?: boolean
          balance?: number
          bank_name?: string
          company_id?: string
          created_at?: string
          currency?: string
          iban?: string
          id?: string
          last4?: string
          limit?: number
          name?: string
          note?: string
          opening_balance?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          amount: number
          bank_name: string
          cari_id: string | null
          company_id: string
          created_at: string
          currency: string
          direction: string
          drawer: string
          due_date: string
          id: string
          issue_date: string | null
          kind: string
          note: string
          serial_no: string
          status: string
        }
        Insert: {
          amount: number
          bank_name: string
          cari_id?: string | null
          company_id: string
          created_at?: string
          currency: string
          direction: string
          drawer: string
          due_date: string
          id?: string
          issue_date?: string | null
          kind: string
          note: string
          serial_no: string
          status: string
        }
        Update: {
          amount?: number
          bank_name?: string
          cari_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          direction?: string
          drawer?: string
          due_date?: string
          id?: string
          issue_date?: string | null
          kind?: string
          note?: string
          serial_no?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instruments_cari_id_fkey"
            columns: ["cari_id"]
            isOneToOne: false
            referencedRelation: "cariler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instruments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          discount: number
          id: string
          invoice_id: string
          name: string
          position: number
          product_id: string | null
          quantity: number
          unit: string
          unit_price: number
          vat: number
        }
        Insert: {
          discount: number
          id?: string
          invoice_id: string
          name: string
          position: number
          product_id?: string | null
          quantity: number
          unit: string
          unit_price: number
          vat: number
        }
        Update: {
          discount?: number
          id?: string
          invoice_id?: string
          name?: string
          position?: number
          product_id?: string | null
          quantity?: number
          unit?: string
          unit_price?: number
          vat?: number
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
      invoices: {
        Row: {
          buyer_city: string
          buyer_district: string
          buyer_tax_no: string
          buyer_tax_office: string
          cari_id: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          date: string
          due_date: string | null
          id: string
          invoice_type: string
          kind: string
          note: string
          number: string
          paid_amount: number
          revised: boolean
          scenario: string
          service_ticket_id: string | null
          status: string
          subtotal: number
          terms: string
          total: number
          vat_total: number
        }
        Insert: {
          buyer_city?: string
          buyer_district?: string
          buyer_tax_no?: string
          buyer_tax_office?: string
          cari_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          date: string
          due_date?: string | null
          id?: string
          invoice_type?: string
          kind: string
          note: string
          number: string
          paid_amount: number
          revised: boolean
          scenario?: string
          service_ticket_id?: string | null
          status: string
          subtotal: number
          terms: string
          total: number
          vat_total: number
        }
        Update: {
          buyer_city?: string
          buyer_district?: string
          buyer_tax_no?: string
          buyer_tax_office?: string
          cari_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          due_date?: string | null
          id?: string
          invoice_type?: string
          kind?: string
          note?: string
          number?: string
          paid_amount?: number
          revised?: boolean
          scenario?: string
          service_ticket_id?: string | null
          status?: string
          subtotal?: number
          terms?: string
          total?: number
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cari_id_fkey"
            columns: ["cari_id"]
            isOneToOne: false
            referencedRelation: "cariler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cari_id: string
          company_id: string
          created_at: string
          date: string
          direction: string
          id: string
          invoice_id: string | null
          method: string
          note: string
        }
        Insert: {
          amount: number
          cari_id: string
          company_id: string
          created_at?: string
          date: string
          direction: string
          id?: string
          invoice_id?: string | null
          method: string
          note: string
        }
        Update: {
          amount?: number
          cari_id?: string
          company_id?: string
          created_at?: string
          date?: string
          direction?: string
          id?: string
          invoice_id?: string | null
          method?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cari_id_fkey"
            columns: ["cari_id"]
            isOneToOne: false
            referencedRelation: "cariler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_holidays: {
        Row: {
          company_id: string
          created_at: string
          holiday_date: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          holiday_date: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_leaves: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          kind: string
          paid: boolean
          reason: string
          staff_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          kind?: string
          paid?: boolean
          reason?: string
          staff_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          kind?: string
          paid?: boolean
          reason?: string
          staff_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_leaves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdks_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "pdks_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_overtime_approvals: {
        Row: {
          approved: boolean
          company_id: string
          created_at: string
          id: string
          staff_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          approved?: boolean
          company_id: string
          created_at?: string
          id?: string
          staff_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          approved?: boolean
          company_id?: string
          created_at?: string
          id?: string
          staff_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_overtime_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdks_overtime_approvals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "pdks_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_punch_log: {
        Row: {
          company_id: string
          created_at: string
          id: string
          ip: string
          method: string
          staff_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          ip?: string
          method?: string
          staff_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          ip?: string
          method?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_punch_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_shifts: {
        Row: {
          break_minutes: number
          company_id: string
          created_at: string
          end_time: string
          id: string
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          company_id: string
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          company_id?: string
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_sites: {
        Row: {
          address: string
          break_minutes: number
          company_id: string
          coords: string
          created_at: string
          id: string
          name: string
          radius: number
          schedule: Json
          work_end: string
          work_start: string
        }
        Insert: {
          address?: string
          break_minutes?: number
          company_id: string
          coords?: string
          created_at?: string
          id?: string
          name: string
          radius?: number
          schedule?: Json
          work_end?: string
          work_start?: string
        }
        Update: {
          address?: string
          break_minutes?: number
          company_id?: string
          coords?: string
          created_at?: string
          id?: string
          name?: string
          radius?: number
          schedule?: Json
          work_end?: string
          work_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdks_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdks_staff: {
        Row: {
          active: boolean
          branch: string
          company_id: string
          created_at: string
          device_id: string
          documents: Json
          exit_date: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string
          pin: string
          role: string
          shift_id: string | null
        }
        Insert: {
          active?: boolean
          branch?: string
          company_id: string
          created_at?: string
          device_id?: string
          documents?: Json
          exit_date?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string
          pin?: string
          role?: string
          shift_id?: string | null
        }
        Update: {
          active?: boolean
          branch?: string
          company_id?: string
          created_at?: string
          device_id?: string
          documents?: Json
          exit_date?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string
          pin?: string
          role?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdks_staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdks_staff_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pdks_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          color: string
          company_id: string
          created_at: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string
          category: string
          color: string
          company_id: string
          cost: number
          created_at: string
          critical_stock: number
          description: string
          id: string
          images: string[]
          name: string
          price: number
          sku: string
          stock: number
          unit: string
          vat: number
        }
        Insert: {
          barcode?: string
          category?: string
          color?: string
          company_id: string
          cost: number
          created_at?: string
          critical_stock: number
          description: string
          id?: string
          images?: string[]
          name: string
          price: number
          sku: string
          stock: number
          unit: string
          vat: number
        }
        Update: {
          barcode?: string
          category?: string
          color?: string
          company_id?: string
          cost?: number
          created_at?: string
          critical_stock?: number
          description?: string
          id?: string
          images?: string[]
          name?: string
          price?: number
          sku?: string
          stock?: number
          unit?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          account_name: string
          cari_id: string | null
          company_id: string
          created_at: string
          currency: string
          id: string
          lines: Json
          no: string
          quote_date: string
          status: string
          subtotal: number
          terms: string
          total: number
          updated_at: string
          valid_until: string | null
          vat_total: number
        }
        Insert: {
          account_name?: string
          cari_id?: string | null
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          lines?: Json
          no?: string
          quote_date?: string
          status?: string
          subtotal?: number
          terms?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
        }
        Update: {
          account_name?: string
          cari_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          lines?: Json
          no?: string
          quote_date?: string
          status?: string
          subtotal?: number
          terms?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_cari_id_fkey"
            columns: ["cari_id"]
            isOneToOne: false
            referencedRelation: "cariler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          accessories: string
          cari_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          device_brand: string
          device_model: string
          device_type: string
          estimated_cost: number
          id: string
          invoice_id: string | null
          lines: Json
          note: string
          number: string
          problem: string
          received_at: string | null
          serial_no: string
          status: string
          technician: string
        }
        Insert: {
          accessories: string
          cari_id: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          device_brand: string
          device_model: string
          device_type: string
          estimated_cost: number
          id?: string
          invoice_id?: string | null
          lines?: Json
          note: string
          number: string
          problem: string
          received_at?: string | null
          serial_no: string
          status: string
          technician: string
        }
        Update: {
          accessories?: string
          cari_id?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          device_brand?: string
          device_model?: string
          device_type?: string
          estimated_cost?: number
          id?: string
          invoice_id?: string | null
          lines?: Json
          note?: string
          number?: string
          problem?: string
          received_at?: string | null
          serial_no?: string
          status?: string
          technician?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_cari_id_fkey"
            columns: ["cari_id"]
            isOneToOne: false
            referencedRelation: "cariler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          perms: string[]
          pin: string
          role: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          email?: string
          id?: string
          name: string
          perms?: string[]
          pin?: string
          role?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          perms?: string[]
          pin?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          date: string
          id: string
          note: string
          product_id: string
          quantity: number
          type: string
        }
        Insert: {
          company_id: string
          date: string
          id?: string
          note: string
          product_id: string
          quantity: number
          type: string
        }
        Update: {
          company_id?: string
          date?: string
          id?: string
          note?: string
          product_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_orders: {
        Row: {
          amount: number
          company_id: string
          company_name: string
          created_at: string
          created_by: string | null
          id: string
          module: string
          note: string
          period: string
          plan: string
          sender_name: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          module?: string
          note?: string
          period?: string
          plan?: string
          sender_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          module?: string
          note?: string
          period?: string
          plan?: string
          sender_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      table_order_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          note: string
          price: number
          product_id: string | null
          qty: number
          status: string
          table_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          note?: string
          price?: number
          product_id?: string | null
          qty?: number
          status?: string
          table_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          note?: string
          price?: number
          product_id?: string | null
          qty?: number
          status?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_order_items_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed_accounts: Json
          company_id: string
          created_at: string
          perms: Json
          sales_scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_accounts?: Json
          company_id: string
          created_at?: string
          perms?: Json
          sales_scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_accounts?: Json
          company_id?: string
          created_at?: string
          perms?: Json
          sales_scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
          permissions: string[]
          role: string
        }
        Insert: {
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
          permissions: string[]
          role: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
          permissions?: string[]
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "staff"
        | "muhasebe"
        | "kasiyer"
        | "garson"
        | "teknik_servis"
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
      app_role: [
        "admin",
        "manager",
        "staff",
        "muhasebe",
        "kasiyer",
        "garson",
        "teknik_servis",
      ],
    },
  },
} as const
