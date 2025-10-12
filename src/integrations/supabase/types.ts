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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      billing_clients: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          customer_product_id: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          customer_product_id: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          customer_product_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_clients_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string | null
          due_date: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          updated_at: string | null
          whatsapp_reminder_sent: boolean | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string | null
          whatsapp_reminder_sent?: boolean | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string | null
          whatsapp_reminder_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "billing_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_settings: {
        Row: {
          auto_send_reminders: boolean | null
          created_at: string | null
          customer_product_id: string
          days_before_due: number | null
          id: string
          updated_at: string | null
          whatsapp_template: string | null
        }
        Insert: {
          auto_send_reminders?: boolean | null
          created_at?: string | null
          customer_product_id: string
          days_before_due?: number | null
          id?: string
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          auto_send_reminders?: boolean | null
          created_at?: string | null
          customer_product_id?: string
          days_before_due?: number | null
          id?: string
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_settings_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          type: string
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          type: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          type?: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      crm_customers: {
        Row: {
          business_type: string | null
          company: string | null
          created_at: string | null
          customer_product_id: string
          email: string | null
          id: string
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          tags: string[] | null
          total_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string | null
          company?: string | null
          created_at?: string | null
          customer_product_id: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string | null
          company?: string | null
          created_at?: string | null
          customer_product_id?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_customers_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string
          id: string
          subject: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description: string
          id?: string
          subject?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string
          id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_products: {
        Row: {
          access_expires_at: string | null
          acquisition_type: Database["public"]["Enums"]["acquisition_type"]
          auto_renew: boolean | null
          created_at: string
          delivered_at: string
          download_count: number
          id: string
          is_active: boolean
          max_downloads: number | null
          monthly_rental_price: number | null
          order_id: string
          product_slug: string
          product_title: string
          rental_end_date: string | null
          rental_payment_status: string | null
          rental_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          acquisition_type?: Database["public"]["Enums"]["acquisition_type"]
          auto_renew?: boolean | null
          created_at?: string
          delivered_at?: string
          download_count?: number
          id?: string
          is_active?: boolean
          max_downloads?: number | null
          monthly_rental_price?: number | null
          order_id: string
          product_slug: string
          product_title: string
          rental_end_date?: string | null
          rental_payment_status?: string | null
          rental_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          acquisition_type?: Database["public"]["Enums"]["acquisition_type"]
          auto_renew?: boolean | null
          created_at?: string
          delivered_at?: string
          download_count?: number
          id?: string
          is_active?: boolean
          max_downloads?: number | null
          monthly_rental_price?: number | null
          order_id?: string
          product_slug?: string
          product_title?: string
          rental_end_date?: string | null
          rental_payment_status?: string | null
          rental_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          created_at: string
          customer_name: string
          customer_photo_url: string | null
          display_order: number | null
          id: string
          is_featured: boolean
          rating: number
          review_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_photo_url?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean
          rating: number
          review_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_photo_url?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean
          rating?: number
          review_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          created_at: string | null
          customer_product_id: string
          id: string
          metrics: Json
          name: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          customer_product_id: string
          id?: string
          metrics?: Json
          name: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          customer_product_id?: string
          id?: string
          metrics?: Json
          name?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_configs_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_data: {
        Row: {
          dashboard_config_id: string
          id: string
          metadata: Json | null
          metric_key: string
          timestamp: string | null
          value: number | null
        }
        Insert: {
          dashboard_config_id: string
          id?: string
          metadata?: Json | null
          metric_key: string
          timestamp?: string | null
          value?: number | null
        }
        Update: {
          dashboard_config_id?: string
          id?: string
          metadata?: Json | null
          metric_key?: string
          timestamp?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_data_dashboard_config_id_fkey"
            columns: ["dashboard_config_id"]
            isOneToOne: false
            referencedRelation: "dashboard_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          customer_product_id: string
          date: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          customer_product_id: string
          date: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          customer_product_id?: string
          date?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          landing_page_id: string
          message: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          landing_page_id: string
          message?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          landing_page_id?: string
          message?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "user_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      order_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          order_id: string
          paid_at: string | null
          payment_proof_url: string | null
          status: string
          total_installments: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          order_id: string
          paid_at?: string | null
          payment_proof_url?: string | null
          status?: string
          total_installments: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          order_id?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          status?: string
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_price: number
          product_slug: string
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_price: number
          product_slug: string
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_price?: number
          product_slug?: string
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          id: string
          installment_count: number | null
          installment_value: number | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_receipt_url: string | null
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          installment_count?: number | null
          installment_value?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_receipt_url?: string | null
          status?: string
          subtotal_amount?: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          installment_count?: number | null
          installment_value?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_receipt_url?: string | null
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      persistent_notifications: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_views: number
          message: string
          subject: string
          type: string
          updated_at: string
          user_id: string | null
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_views?: number
          message: string
          subject: string
          type?: string
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_views?: number
          message?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Relationships: []
      }
      product_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          credential_value: string | null
          customer_product_id: string
          id: string
          is_active: boolean | null
          is_system_generated: boolean | null
          n8n_doc_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          credential_value?: string | null
          customer_product_id: string
          id?: string
          is_active?: boolean | null
          is_system_generated?: boolean | null
          n8n_doc_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_type?: Database["public"]["Enums"]["credential_type"]
          credential_value?: string | null
          customer_product_id?: string
          id?: string
          is_active?: boolean | null
          is_system_generated?: boolean | null
          n8n_doc_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_credentials_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_required_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          description: string | null
          id: string
          is_required: boolean | null
          n8n_doc_url: string | null
          product_slug: string
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          description?: string | null
          id?: string
          is_required?: boolean | null
          n8n_doc_url?: string | null
          product_slug: string
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_type?: Database["public"]["Enums"]["credential_type"]
          description?: string | null
          id?: string
          is_required?: boolean | null
          n8n_doc_url?: string | null
          product_slug?: string
        }
        Relationships: []
      }
      products_content: {
        Row: {
          content_type: string
          created_at: string
          file_content: string
          file_path: string
          id: string
          is_active: boolean
          product_slug: string
          product_title: string
          updated_at: string
          version: number
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_content: string
          file_path: string
          id?: string
          is_active?: boolean
          product_slug: string
          product_title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content_type?: string
          created_at?: string
          file_content?: string
          file_path?: string
          id?: string
          is_active?: boolean
          product_slug?: string
          product_title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          customer_product_id: string
          id: string
          image_url: string | null
          platforms: string[]
          published_at: string | null
          scheduled_for: string
          status: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_product_id: string
          id?: string
          image_url?: string | null
          platforms: string[]
          published_at?: string | null
          scheduled_for: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_product_id?: string
          id?: string
          image_url?: string | null
          platforms?: string[]
          published_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_landing_pages: {
        Row: {
          colors: Json | null
          company_name: string
          conversions: number | null
          created_at: string | null
          cta_text: string | null
          customer_product_id: string
          headline: string
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          slug: string
          subheadline: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          colors?: Json | null
          company_name: string
          conversions?: number | null
          created_at?: string | null
          cta_text?: string | null
          customer_product_id: string
          headline: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          subheadline?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          colors?: Json | null
          company_name?: string
          conversions?: number | null
          created_at?: string | null
          cta_text?: string | null
          customer_product_id?: string
          headline?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          subheadline?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_landing_pages_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_leads: {
        Row: {
          created_at: string | null
          first_message: string | null
          id: string
          phone_number: string
          product_slug: string
          product_title: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_message?: string | null
          id?: string
          phone_number: string
          product_slug: string
          product_title: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_message?: string | null
          id?: string
          phone_number?: string
          product_slug?: string
          product_title?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          lead_id: string | null
          message: string
          phone_number: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          message: string
          phone_number: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          message?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_connections: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string
          is_active: boolean | null
          phone_number: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_id: string
          is_active?: boolean | null
          phone_number: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string
          is_active?: boolean | null
          phone_number?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      acquisition_type: "purchase" | "rental"
      credential_type:
        | "openai_api_key"
        | "facebook_graph_api"
        | "instagram_graph_api"
        | "whatsapp_api"
        | "discord_bot_token"
        | "telegram_bot_api"
        | "database_connection"
        | "google_sheets_api"
        | "erp_api"
        | "pix_credentials"
        | "payment_gateway"
        | "zapi_credentials"
        | "smtp_credentials"
        | "other"
      user_role: "admin" | "customer"
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
      acquisition_type: ["purchase", "rental"],
      credential_type: [
        "openai_api_key",
        "facebook_graph_api",
        "instagram_graph_api",
        "whatsapp_api",
        "discord_bot_token",
        "telegram_bot_api",
        "database_connection",
        "google_sheets_api",
        "erp_api",
        "pix_credentials",
        "payment_gateway",
        "zapi_credentials",
        "smtp_credentials",
        "other",
      ],
      user_role: ["admin", "customer"],
    },
  },
} as const
