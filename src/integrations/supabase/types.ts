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
      ai_control_config: {
        Row: {
          action_instructions: string | null
          ai_credentials: Json | null
          ai_model: string | null
          auto_restart: boolean | null
          configuration: Json | null
          created_at: string | null
          current_requests_count: number | null
          customer_product_id: string
          id: string
          is_active: boolean | null
          last_activity: string | null
          max_requests_per_day: number | null
          max_tokens: number | null
          memory_connection_string: string | null
          memory_session_id: string | null
          memory_type: string | null
          n8n_webhook_url: string | null
          personality: string | null
          system_prompt: string | null
          temperature: number | null
          tools_enabled: Json | null
          updated_at: string | null
        }
        Insert: {
          action_instructions?: string | null
          ai_credentials?: Json | null
          ai_model?: string | null
          auto_restart?: boolean | null
          configuration?: Json | null
          created_at?: string | null
          current_requests_count?: number | null
          customer_product_id: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          max_requests_per_day?: number | null
          max_tokens?: number | null
          memory_connection_string?: string | null
          memory_session_id?: string | null
          memory_type?: string | null
          n8n_webhook_url?: string | null
          personality?: string | null
          system_prompt?: string | null
          temperature?: number | null
          tools_enabled?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_instructions?: string | null
          ai_credentials?: Json | null
          ai_model?: string | null
          auto_restart?: boolean | null
          configuration?: Json | null
          created_at?: string | null
          current_requests_count?: number | null
          customer_product_id?: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          max_requests_per_day?: number | null
          max_tokens?: number | null
          memory_connection_string?: string | null
          memory_session_id?: string | null
          memory_type?: string | null
          n8n_webhook_url?: string | null
          personality?: string | null
          system_prompt?: string | null
          temperature?: number | null
          tools_enabled?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_control_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_control_logs: {
        Row: {
          created_at: string | null
          customer_product_id: string
          event_data: Json | null
          event_type: string
          id: string
          webhook_response: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_product_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          webhook_response?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_product_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          webhook_response?: string | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_control_logs_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          created_at: string
          customer_product_id: string
          date: string
          id: string
          model_used: string | null
          n8n_workflow_id: string | null
          requests_count: number
          tokens_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          date?: string
          id?: string
          model_used?: string | null
          n8n_workflow_id?: string | null
          requests_count?: number
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          date?: string
          id?: string
          model_used?: string | null
          n8n_workflow_id?: string | null
          requests_count?: number
          tokens_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
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
          payment_link: string | null
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
          payment_link?: string | null
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
          payment_link?: string | null
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
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          direction: string
          gmail: string
          id: string
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          direction: string
          gmail: string
          id?: string
          type: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          direction?: string
          gmail?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      collection_settings: {
        Row: {
          auto_send_reminders: boolean | null
          created_at: string | null
          customer_product_id: string
          days_before_due: number | null
          id: string
          message_type: string | null
          n8n_webhook_url: string | null
          template_message: string | null
          updated_at: string | null
          whatsapp_template: string | null
        }
        Insert: {
          auto_send_reminders?: boolean | null
          created_at?: string | null
          customer_product_id: string
          days_before_due?: number | null
          id?: string
          message_type?: string | null
          n8n_webhook_url?: string | null
          template_message?: string | null
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          auto_send_reminders?: boolean | null
          created_at?: string | null
          customer_product_id?: string
          days_before_due?: number | null
          id?: string
          message_type?: string | null
          n8n_webhook_url?: string | null
          template_message?: string | null
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
      crm_message_templates: {
        Row: {
          content: string
          created_at: string | null
          customer_product_id: string
          id: string
          is_active: boolean | null
          message_type: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_product_id: string
          id?: string
          is_active?: boolean | null
          message_type?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_product_id?: string
          id?: string
          is_active?: boolean | null
          message_type?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_message_templates_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          created_at: string | null
          customer_id: string
          expected_close_date: string | null
          id: string
          notes: string | null
          probability: number | null
          stage: string
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhook_config: {
        Row: {
          created_at: string | null
          customer_product_id: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          customer_product_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          customer_product_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
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
          n8n_workflow_id: string | null
          order_id: string
          product_slug: string
          product_title: string
          rental_end_date: string | null
          rental_payment_status: string | null
          rental_start_date: string | null
          updated_at: string
          user_id: string
          webhook_token: string | null
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
          n8n_workflow_id?: string | null
          order_id: string
          product_slug: string
          product_title: string
          rental_end_date?: string | null
          rental_payment_status?: string | null
          rental_start_date?: string | null
          updated_at?: string
          user_id: string
          webhook_token?: string | null
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
          n8n_workflow_id?: string | null
          order_id?: string
          product_slug?: string
          product_title?: string
          rental_end_date?: string | null
          rental_payment_status?: string | null
          rental_start_date?: string | null
          updated_at?: string
          user_id?: string
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_products_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      loyalty_clients: {
        Row: {
          created_at: string
          customer_product_id: string
          email: string | null
          id: string
          last_transaction_date: string | null
          name: string
          notes: string | null
          phone: string
          points_balance: number
          status: string
          total_points_earned: number
          total_points_redeemed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          last_transaction_date?: string | null
          name: string
          notes?: string | null
          phone: string
          points_balance?: number
          status?: string
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          last_transaction_date?: string | null
          name?: string
          notes?: string | null
          phone?: string
          points_balance?: number
          status?: string
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_clients_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_message_templates: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          name: string
          template: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          name: string
          template: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          name?: string
          template?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_message_templates_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          customer_product_id: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          quantity_available: number | null
          total_redeemed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          quantity_available?: number | null
          total_redeemed?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          quantity_available?: number | null
          total_redeemed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          auto_send_messages: boolean
          conversion_rate: number
          created_at: string
          customer_product_id: string
          id: string
          points_expiry_days: number | null
          updated_at: string
          webhook_url: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_send_messages?: boolean
          conversion_rate?: number
          created_at?: string
          customer_product_id: string
          id?: string
          points_expiry_days?: number | null
          updated_at?: string
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_send_messages?: boolean
          conversion_rate?: number
          created_at?: string
          customer_product_id?: string
          id?: string
          points_expiry_days?: number | null
          updated_at?: string
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          client_id: string
          created_at: string
          customer_product_id: string
          description: string | null
          id: string
          origin: string | null
          points_amount: number
          reward_id: string | null
          transaction_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          customer_product_id: string
          description?: string | null
          id?: string
          origin?: string | null
          points_amount: number
          reward_id?: string | null
          transaction_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          customer_product_id?: string
          description?: string | null
          id?: string
          origin?: string | null
          points_amount?: number
          reward_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "loyalty_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_logs: {
        Row: {
          created_at: string | null
          data: Json
          event_type: string
          id: string
          ip_address: string | null
          order_id: string | null
          payment_id: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          event_type: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          payment_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          event_type?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          payment_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mp_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "mp_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          product_price: number
          product_slug: string
          product_title: string
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_price: number
          product_slug: string
          product_title: string
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_price?: number
          product_slug?: string
          product_title?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mp_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mp_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          id: string
          payment_method: string | null
          status: string | null
          subtotal_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          payment_method?: string | null
          status?: string | null
          subtotal_amount: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          payment_method?: string | null
          status?: string | null
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      mp_payments: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string | null
          id: string
          mercadopago_payment_id: string | null
          metadata: Json | null
          order_id: string | null
          payer_email: string | null
          payer_name: string | null
          payment_method: string | null
          payment_type: string | null
          preference_id: string | null
          proof_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method?: string | null
          payment_type?: string | null
          preference_id?: string | null
          proof_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method?: string | null
          payment_type?: string | null
          preference_id?: string | null
          proof_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mp_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_products: {
        Row: {
          category: string | null
          created_at: string | null
          delivery: string | null
          description: string | null
          features: Json | null
          id: string
          images: Json | null
          in_stock: boolean | null
          price: number
          rental_price: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          delivery?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          in_stock?: boolean | null
          price: number
          rental_price?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          delivery?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          in_stock?: boolean | null
          price?: number
          rental_price?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_agent_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          agent_id?: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: []
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
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      sales_assistant_config: {
        Row: {
          ai_prospecting_enabled: boolean | null
          auto_follow_up_enabled: boolean | null
          auto_prioritization_enabled: boolean | null
          created_at: string
          crm_api_key: string | null
          crm_integration_enabled: boolean | null
          customer_product_id: string
          follow_up_delay_hours: number | null
          id: string
          lead_scoring_enabled: boolean | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          ai_prospecting_enabled?: boolean | null
          auto_follow_up_enabled?: boolean | null
          auto_prioritization_enabled?: boolean | null
          created_at?: string
          crm_api_key?: string | null
          crm_integration_enabled?: boolean | null
          customer_product_id: string
          follow_up_delay_hours?: number | null
          id?: string
          lead_scoring_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          ai_prospecting_enabled?: boolean | null
          auto_follow_up_enabled?: boolean | null
          auto_prioritization_enabled?: boolean | null
          created_at?: string
          crm_api_key?: string | null
          crm_integration_enabled?: boolean | null
          customer_product_id?: string
          follow_up_delay_hours?: number | null
          id?: string
          lead_scoring_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_assistant_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_follow_ups: {
        Row: {
          completed_at: string | null
          content: string | null
          created_at: string
          id: string
          lead_id: string
          outcome: string | null
          scheduled_at: string
          status: string | null
          subject: string | null
          type: string
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          outcome?: string | null
          scheduled_at: string
          status?: string | null
          subject?: string | null
          type: string
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          outcome?: string | null
          scheduled_at?: string
          status?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          achieved_leads: number | null
          achieved_meetings: number | null
          achieved_proposals: number | null
          achieved_revenue: number | null
          created_at: string
          customer_product_id: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          target_leads: number | null
          target_meetings: number | null
          target_proposals: number | null
          target_revenue: number | null
          updated_at: string
        }
        Insert: {
          achieved_leads?: number | null
          achieved_meetings?: number | null
          achieved_proposals?: number | null
          achieved_revenue?: number | null
          created_at?: string
          customer_product_id: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          target_leads?: number | null
          target_meetings?: number | null
          target_proposals?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Update: {
          achieved_leads?: number | null
          achieved_meetings?: number | null
          achieved_proposals?: number | null
          achieved_revenue?: number | null
          created_at?: string
          customer_product_id?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          target_leads?: number | null
          target_meetings?: number | null
          target_proposals?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          company: string | null
          created_at: string
          customer_product_id: string
          email: string | null
          estimated_value: number | null
          id: string
          last_contact_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          position: string | null
          priority: string | null
          score: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          customer_product_id: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          customer_product_id?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_meetings: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string
          location: string | null
          meeting_link: string | null
          meeting_type: string | null
          notes: string | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipeline: {
        Row: {
          customer_product_id: string
          entered_at: string
          exited_at: string | null
          id: string
          lead_id: string
          notes: string | null
          stage: string
        }
        Insert: {
          customer_product_id: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          stage: string
        }
        Update: {
          customer_product_id?: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_pipeline_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_pipeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
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
      starai_credits: {
        Row: {
          balance_brl: number
          created_at: string
          deposited_brl: number
          free_balance_brl: number
          id: string
          total_used_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_brl?: number
          created_at?: string
          deposited_brl?: number
          free_balance_brl?: number
          id?: string
          total_used_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_brl?: number
          created_at?: string
          deposited_brl?: number
          free_balance_brl?: number
          id?: string
          total_used_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      starai_purchases: {
        Row: {
          amount_brl: number
          created_at: string
          id: string
          mercadopago_payment_id: string | null
          payment_id: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          amount_brl: number
          created_at?: string
          id?: string
          mercadopago_payment_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          amount_brl?: number
          created_at?: string
          id?: string
          mercadopago_payment_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      starai_transactions: {
        Row: {
          amount_brl: number
          created_at: string
          description: string | null
          id: string
          payment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
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
      tutorial_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          product_slug: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          product_slug: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          product_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
