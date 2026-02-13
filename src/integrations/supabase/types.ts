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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          ai_analysis: Json | null
          cart_items: Json
          created_at: string
          id: string
          last_event_at: string
          recommended_actions: Json | null
          recommended_message: string | null
          stage: string
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          cart_items?: Json
          created_at?: string
          id?: string
          last_event_at?: string
          recommended_actions?: Json | null
          recommended_message?: string | null
          stage: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          cart_items?: Json
          created_at?: string
          id?: string
          last_event_at?: string
          recommended_actions?: Json | null
          recommended_message?: string | null
          stage?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_control_config: {
        Row: {
          action_instructions: string | null
          business_name: string | null
          configuration: Json | null
          created_at: string
          customer_product_id: string | null
          id: string
          is_active: boolean
          max_tokens: number | null
          model: string | null
          n8n_webhook_url: string | null
          personality: string | null
          provider: string | null
          system_prompt: string | null
          temperature: number | null
          tools_enabled: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_instructions?: string | null
          business_name?: string | null
          configuration?: Json | null
          created_at?: string
          customer_product_id?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model?: string | null
          n8n_webhook_url?: string | null
          personality?: string | null
          provider?: string | null
          system_prompt?: string | null
          temperature?: number | null
          tools_enabled?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_instructions?: string | null
          business_name?: string | null
          configuration?: Json | null
          created_at?: string
          customer_product_id?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model?: string | null
          n8n_webhook_url?: string | null
          personality?: string | null
          provider?: string | null
          system_prompt?: string | null
          temperature?: number | null
          tools_enabled?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_instances: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      bot_scripts: {
        Row: {
          created_at: string
          customer_product_id: string
          entrypoint_path: string
          id: string
          is_active: boolean
          language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          entrypoint_path: string
          id?: string
          is_active?: boolean
          language: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          entrypoint_path?: string
          id?: string
          is_active?: boolean
          language?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_value: number | null
          updated_at: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_value?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_value?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      crm_ai_config: {
        Row: {
          created_at: string
          id: string
          max_tokens: number | null
          model: string | null
          provider: string | null
          temperature: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          model?: string | null
          provider?: string | null
          temperature?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          model?: string | null
          provider?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_ai_pending_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_ai_reports: {
        Row: {
          content: string | null
          generated_at: string
          id: string
          report_type: string
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          generated_at?: string
          id?: string
          report_type: string
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          generated_at?: string
          id?: string
          report_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_message_templates: {
        Row: {
          content: string
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          message_type: string | null
          name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          message_type?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          message_type?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_webhook_config: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          updated_at: string
          webhook_token: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      customer_products: {
        Row: {
          access_expires_at: string | null
          acquisition_type: Database["public"]["Enums"]["acquisition_type"]
          created_at: string
          delivered_at: string | null
          download_count: number
          id: string
          is_active: boolean
          max_downloads: number | null
          monthly_rental_price: number | null
          n8n_workflow_id: string | null
          product_slug: string
          product_title: string | null
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
          created_at?: string
          delivered_at?: string | null
          download_count?: number
          id?: string
          is_active?: boolean
          max_downloads?: number | null
          monthly_rental_price?: number | null
          n8n_workflow_id?: string | null
          product_slug: string
          product_title?: string | null
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
          created_at?: string
          delivered_at?: string | null
          download_count?: number
          id?: string
          is_active?: boolean
          max_downloads?: number | null
          monthly_rental_price?: number | null
          n8n_workflow_id?: string | null
          product_slug?: string
          product_title?: string | null
          rental_end_date?: string | null
          rental_payment_status?: string | null
          rental_start_date?: string | null
          updated_at?: string
          user_id?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          created_at: string
          customer_name: string
          customer_photo_url: string | null
          display_order: number
          id: string
          is_approved: boolean
          is_featured: boolean
          rating: number | null
          review_text: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_photo_url?: string | null
          display_order?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating?: number | null
          review_text: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_photo_url?: string | null
          display_order?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating?: number | null
          review_text?: string
        }
        Relationships: []
      }
      financial_agent_chat_logs: {
        Row: {
          created_at: string
          customer_product_id: string
          direction: string
          id: string
          message: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          direction: string
          id?: string
          message: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          direction?: string
          id?: string
          message?: string
          session_id?: string | null
        }
        Relationships: []
      }
      financial_agent_config: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          updated_at: string
          webhook_token: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          updated_at?: string
          webhook_token: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          updated_at?: string
          webhook_token?: string
        }
        Relationships: []
      }
      financial_agent_goals: {
        Row: {
          created_at: string
          current_amount: number
          customer_product_id: string
          deadline: string | null
          id: string
          name: string
          status: string | null
          target_amount: number
        }
        Insert: {
          created_at?: string
          current_amount?: number
          customer_product_id: string
          deadline?: string | null
          id?: string
          name: string
          status?: string | null
          target_amount: number
        }
        Update: {
          created_at?: string
          current_amount?: number
          customer_product_id?: string
          deadline?: string | null
          id?: string
          name?: string
          status?: string | null
          target_amount?: number
        }
        Relationships: []
      }
      financial_agent_invoices: {
        Row: {
          amount: number
          created_at: string
          customer_product_id: string
          due_date: string
          id: string
          notes: string | null
          recurring: boolean
          recurring_interval: string | null
          source: string | null
          status: string | null
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_product_id: string
          due_date: string
          id?: string
          notes?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          source?: string | null
          status?: string | null
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_product_id?: string
          due_date?: string
          id?: string
          notes?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          source?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      financial_agent_sessions: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          session_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          session_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          session_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_agent_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_product_id: string
          date: string | null
          description: string | null
          id: string
          payment_method: string | null
          source: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_product_id: string
          date?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          source?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_product_id?: string
          date?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          source?: string | null
          type?: string
        }
        Relationships: []
      }
      free_trials: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          product_slug: string
          status: Database["public"]["Enums"]["trial_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          product_slug: string
          status?: Database["public"]["Enums"]["trial_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          product_slug?: string
          status?: Database["public"]["Enums"]["trial_status"]
          user_id?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          order_id: string
          paid_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          order_id: string
          paid_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          order_id?: string
          paid_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          name: string
          phone: string | null
          points: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          points?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_message_templates: {
        Row: {
          content: string
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          name: string
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          name: string
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          customer_product_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_required: number
          total_redeemed: number
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_required: number
          total_redeemed?: number
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
          total_redeemed?: number
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string
          customer_product_id: string
          expiration_days: number | null
          id: string
          points_per_real: number | null
          updated_at: string
          welcome_bonus: number | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          expiration_days?: number | null
          id?: string
          points_per_real?: number | null
          updated_at?: string
          welcome_bonus?: number | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          expiration_days?: number | null
          id?: string
          points_per_real?: number | null
          updated_at?: string
          welcome_bonus?: number | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          client_id: string | null
          created_at: string
          customer_product_id: string
          description: string | null
          id: string
          points: number
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          customer_product_id: string
          description?: string | null
          id?: string
          points: number
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          customer_product_id?: string
          description?: string | null
          id?: string
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "loyalty_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_email_otps: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      mfa_trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          expires_at: string
          id: string
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          expires_at: string
          id?: string
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          expires_at?: string
          id?: string
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_name: string | null
          product_slug: string
          product_title: string
          quantity: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_name?: string | null
          product_slug: string
          product_title: string
          quantity?: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_name?: string | null
          product_slug?: string
          product_title?: string
          quantity?: number
          unit_price?: number | null
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
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          payment_receipt_url: string | null
          status: string | null
          total: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          status?: string | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          status?: string | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_credentials: {
        Row: {
          created_at: string
          credential_key: string
          credential_value: string | null
          id: string
          product_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_key: string
          credential_value?: string | null
          id?: string
          product_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_key?: string
          credential_value?: string | null
          id?: string
          product_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_rentals: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          product_slug: string
          product_title: string | null
          rental_price: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          product_slug: string
          product_title?: string | null
          rental_price?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          product_slug?: string
          product_title?: string | null
          rental_price?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_required_credentials: {
        Row: {
          created_at: string
          credential_key: string
          credential_label: string
          credential_type: string | null
          id: string
          is_required: boolean
          product_slug: string
        }
        Insert: {
          created_at?: string
          credential_key: string
          credential_label: string
          credential_type?: string | null
          id?: string
          is_required?: boolean
          product_slug: string
        }
        Update: {
          created_at?: string
          credential_key?: string
          credential_label?: string
          credential_type?: string | null
          id?: string
          is_required?: boolean
          product_slug?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          is_approved: boolean
          is_featured: boolean
          product_slug: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          product_slug: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          product_slug?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_carousel_slides: {
        Row: {
          created_at: string
          eyebrow: string | null
          href: string | null
          id: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eyebrow?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eyebrow?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rh_candidatos: {
        Row: {
          created_at: string
          customer_product_id: string
          email: string | null
          id: string
          nome: string
          status: string | null
          telefone: string | null
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          nome: string
          status?: string | null
          telefone?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          nome?: string
          status?: string | null
          telefone?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_entrevistas: {
        Row: {
          agendada_em: string | null
          candidato_id: string | null
          created_at: string
          customer_product_id: string
          id: string
          notas: string | null
          status: string | null
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          agendada_em?: string | null
          candidato_id?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          notas?: string | null
          status?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          agendada_em?: string | null
          candidato_id?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          notas?: string | null
          status?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_entrevistas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "rh_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_entrevistas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_vagas: {
        Row: {
          created_at: string
          customer_product_id: string
          descricao: string | null
          id: string
          status: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          descricao?: string | null
          id?: string
          status?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          descricao?: string | null
          id?: string
          status?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_ai_insights: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          insight_type: string
          priority: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          insight_type: string
          priority?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          insight_type?: string
          priority?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_follow_ups: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_at: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          type?: string
          user_id?: string
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
      sales_leads: {
        Row: {
          ai_analysis: string | null
          ai_score: number | null
          ai_sentiment: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_score?: number | null
          ai_sentiment?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_score?: number | null
          ai_sentiment?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_meetings: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          lead_id: string | null
          location: string | null
          notes: string | null
          scheduled_at: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          user_id?: string
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
          created_at: string
          expected_close_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          probability: number | null
          stage: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_pipeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_completions: {
        Row: {
          completed: boolean
          completed_steps: Json | null
          created_at: string
          current_step: number
          id: string
          product_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          product_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          product_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          method: string
          trusted_device_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          method?: string
          trusted_device_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          method?: string
          trusted_device_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_inbox_events: {
        Row: {
          customer_product_id: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
          source: string
        }
        Insert: {
          customer_product_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          source?: string
        }
        Update: {
          customer_product_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
      worker_instances: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          shared_secret: string
          updated_at: string
          worker_base_url: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          shared_secret: string
          updated_at?: string
          worker_base_url: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          shared_secret?: string
          updated_at?: string
          worker_base_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deliver_order_products: {
        Args: { order_id_param: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_customer_product: {
        Args: { _customer_product_id: string }
        Returns: boolean
      }
      update_expired_trials: { Args: never; Returns: undefined }
    }
    Enums: {
      acquisition_type: "purchase" | "rental"
      app_role: "admin" | "moderator" | "user"
      trial_status: "active" | "expired" | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      trial_status: ["active", "expired", "cancelled"],
    },
  },
} as const
