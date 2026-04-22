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
      audit_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_conversation_logs: {
        Row: {
          created_at: string
          customer_product_id: string
          direction: string
          id: string
          message_text: string
          model: string | null
          phone: string | null
          processing_ms: number | null
          provider: string | null
          source: string
          tokens_used: number | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          direction: string
          id?: string
          message_text: string
          model?: string | null
          phone?: string | null
          processing_ms?: number | null
          provider?: string | null
          source?: string
          tokens_used?: number | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          direction?: string
          id?: string
          message_text?: string
          model?: string | null
          phone?: string | null
          processing_ms?: number | null
          provider?: string | null
          source?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      bot_faq: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          customer_product_id: string
          hit_count: number
          id: string
          is_active: boolean
          keywords: string[] | null
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          customer_product_id: string
          hit_count?: number
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          customer_product_id?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bot_handoff_config: {
        Row: {
          auto_message: string | null
          created_at: string
          customer_product_id: string
          id: string
          is_enabled: boolean
          notification_message: string | null
          notification_phone: string | null
          pause_minutes: number
          return_message: string | null
          trigger_keywords: string[]
          updated_at: string
        }
        Insert: {
          auto_message?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          is_enabled?: boolean
          notification_message?: string | null
          notification_phone?: string | null
          pause_minutes?: number
          return_message?: string | null
          trigger_keywords?: string[]
          updated_at?: string
        }
        Update: {
          auto_message?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          is_enabled?: boolean
          notification_message?: string | null
          notification_phone?: string | null
          pause_minutes?: number
          return_message?: string | null
          trigger_keywords?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      bot_handoff_sessions: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          last_activity_at: string
          phone: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          last_activity_at?: string
          phone: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          last_activity_at?: string
          phone?: string
          started_at?: string
          status?: string
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
      bot_knowledge_base: {
        Row: {
          content: string | null
          created_at: string
          customer_product_id: string
          entry_type: string
          error_message: string | null
          file_mime_type: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          customer_product_id: string
          entry_type?: string
          error_message?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          customer_product_id?: string
          entry_type?: string
          error_message?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_report_config: {
        Row: {
          created_at: string
          customer_product_id: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          recipient_email: string
          recipient_name: string | null
          report_sections: string[] | null
          send_day: number | null
          send_hour: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          report_sections?: string[] | null
          send_day?: number | null
          send_hour?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          report_sections?: string[] | null
          send_day?: number | null
          send_hour?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_report_logs: {
        Row: {
          customer_product_id: string
          error_message: string | null
          frequency: string
          id: string
          period_end: string
          period_start: string
          recipient_email: string
          report_config_id: string | null
          report_data: Json | null
          sent_at: string
          status: string
        }
        Insert: {
          customer_product_id: string
          error_message?: string | null
          frequency: string
          id?: string
          period_end: string
          period_start: string
          recipient_email: string
          report_config_id?: string | null
          report_data?: Json | null
          sent_at?: string
          status?: string
        }
        Update: {
          customer_product_id?: string
          error_message?: string | null
          frequency?: string
          id?: string
          period_end?: string
          period_start?: string
          recipient_email?: string
          report_config_id?: string | null
          report_data?: Json | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_report_logs_report_config_id_fkey"
            columns: ["report_config_id"]
            isOneToOne: false
            referencedRelation: "bot_report_config"
            referencedColumns: ["id"]
          },
        ]
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
      bot_usage_metrics: {
        Row: {
          created_at: string
          customer_product_id: string
          data_bytes_in: number
          data_bytes_out: number
          event_type: string
          id: string
          model: string | null
          processing_ms: number
          provider: string | null
          tokens_input: number
          tokens_output: number
          tokens_total: number
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          data_bytes_in?: number
          data_bytes_out?: number
          event_type?: string
          id?: string
          model?: string | null
          processing_ms?: number
          provider?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          data_bytes_in?: number
          data_bytes_out?: number
          event_type?: string
          id?: string
          model?: string | null
          processing_ms?: number
          provider?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number
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
      crm_capture_settings: {
        Row: {
          active_weekdays: number[]
          ai_enrichment_enabled: boolean
          business_hours_end: string
          business_hours_start: string
          created_at: string
          customer_product_id: string
          default_source: string
          default_status: string
          id: string
          ignore_outside_hours: boolean
          is_enabled: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          active_weekdays?: number[]
          ai_enrichment_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          created_at?: string
          customer_product_id: string
          default_source?: string
          default_status?: string
          id?: string
          ignore_outside_hours?: boolean
          is_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          active_weekdays?: number[]
          ai_enrichment_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          created_at?: string
          customer_product_id?: string
          default_source?: string
          default_status?: string
          id?: string
          ignore_outside_hours?: boolean
          is_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_client_memories: {
        Row: {
          client_name: string
          client_phone: string | null
          created_at: string
          customer_product_id: string
          id: string
          interaction_date: string
          raw_message_count: number | null
          search_vector: unknown
          sentiment: string | null
          summary: string
          topics: string[] | null
        }
        Insert: {
          client_name: string
          client_phone?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          interaction_date?: string
          raw_message_count?: number | null
          search_vector?: unknown
          sentiment?: string | null
          summary: string
          topics?: string[] | null
        }
        Update: {
          client_name?: string
          client_phone?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          interaction_date?: string
          raw_message_count?: number | null
          search_vector?: unknown
          sentiment?: string | null
          summary?: string
          topics?: string[] | null
        }
        Relationships: []
      }
      crm_customers: {
        Row: {
          business_type: string | null
          company: string | null
          created_at: string
          customer_product_id: string
          email: string | null
          id: string
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          company?: string | null
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          company?: string | null
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_follow_up_logs: {
        Row: {
          attempt_number: number
          client_name: string
          client_phone: string | null
          created_at: string
          customer_product_id: string
          id: string
          message_sent: string
          opportunity_id: string | null
          rule_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt_number?: number
          client_name: string
          client_phone?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          message_sent: string
          opportunity_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt_number?: number
          client_name?: string
          client_phone?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          message_sent?: string
          opportunity_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_follow_up_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_follow_up_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_follow_up_rules: {
        Row: {
          channel: string
          created_at: string
          customer_product_id: string
          delay_hours: number
          id: string
          is_active: boolean
          max_attempts: number
          message_template: string
          name: string
          target_stage: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_product_id: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          max_attempts?: number
          message_template: string
          name: string
          target_stage?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_product_id?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          max_attempts?: number
          message_template?: string
          name?: string
          target_stage?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_interactions: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_product_id: string
          description: string
          id: string
          subject: string | null
          type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_product_id: string
          description: string
          id?: string
          subject?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_product_id?: string
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
          {
            foreignKeyName: "crm_interactions_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
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
      crm_notifications: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          is_read: boolean
          link_path: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      crm_opportunities: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_product_id: string
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          notes: string | null
          priority: string | null
          probability: number | null
          source: string | null
          stage: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_product_id: string
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_product_id?: string
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
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
      evolution_instances: {
        Row: {
          created_at: string
          customer_product_id: string
          evolution_apikey: string
          evolution_url: string
          groq_api_key: string | null
          id: string
          instance_name: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          evolution_apikey?: string
          evolution_url?: string
          groq_api_key?: string | null
          id?: string
          instance_name: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          evolution_apikey?: string
          evolution_url?: string
          groq_api_key?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_agent_action_requests: {
        Row: {
          action_type: string
          created_at: string
          customer_product_id: string
          id: string
          payload: Json
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          customer_product_id: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          customer_product_id?: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
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
      financial_agent_chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          customer_product_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          customer_product_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          customer_product_id?: string
          id?: string
          role?: string
          user_id?: string
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
      financial_agent_imports: {
        Row: {
          created_at: string
          customer_product_id: string
          error_message: string | null
          file_name: string | null
          id: string
          imported_rows: number
          skipped_rows: number
          source_format: string
          status: string
          total_rows: number
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          imported_rows?: number
          skipped_rows?: number
          source_format: string
          status?: string
          total_rows?: number
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          imported_rows?: number
          skipped_rows?: number
          source_format?: string
          status?: string
          total_rows?: number
        }
        Relationships: []
      }
      financial_agent_invoices: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string | null
          created_at: string
          customer_product_id: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number
          parent_invoice_id: string | null
          payment_method: string | null
          recurring: boolean
          recurring_interval: string | null
          source: string | null
          status: string | null
          supplier: string | null
          title: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          customer_product_id: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number
          parent_invoice_id?: string | null
          payment_method?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          source?: string | null
          status?: string | null
          supplier?: string | null
          title: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          customer_product_id?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          parent_invoice_id?: string | null
          payment_method?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          source?: string | null
          status?: string | null
          supplier?: string | null
          title?: string
        }
        Relationships: []
      }
      financial_agent_permissions: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_agent_security: {
        Row: {
          created_at: string
          customer_product_id: string
          id: string
          require_2fa: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          id?: string
          require_2fa?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          id?: string
          require_2fa?: boolean
          updated_at?: string
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
          category: string | null
          created_at: string
          customer_product_id: string
          date: string | null
          description: string | null
          id: string
          payment_method: string | null
          source: string | null
          tags: string[] | null
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          customer_product_id: string
          date?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          source?: string | null
          tags?: string[] | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_product_id?: string
          date?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          source?: string | null
          tags?: string[] | null
          type?: string
        }
        Relationships: []
      }
      financial_budgets: {
        Row: {
          alert_threshold: number
          budget_amount: number
          category: string | null
          color: string
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          period: string
          updated_at: string
        }
        Insert: {
          alert_threshold?: number
          budget_amount?: number
          category?: string | null
          color?: string
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          period?: string
          updated_at?: string
        }
        Update: {
          alert_threshold?: number
          budget_amount?: number
          category?: string | null
          color?: string
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          period?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_calendar_events: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_product_id: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          metadata: Json | null
          paid_at: string | null
          recurring: boolean
          recurring_interval: string | null
          recurring_until: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_product_id: string
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          recurring_until?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_product_id?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          recurring?: boolean
          recurring_interval?: string | null
          recurring_until?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_calendar_events_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_das_guides: {
        Row: {
          aliquota_efetiva: number
          anexo: string | null
          barcode: string | null
          competencia_month: number
          competencia_year: number
          created_at: string
          customer_product_id: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          pdf_storage_path: string | null
          pdf_url: string | null
          pix_copy_paste: string | null
          regime: string
          revenue_12m: number
          revenue_month: number
          tax_breakdown: Json
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aliquota_efetiva?: number
          anexo?: string | null
          barcode?: string | null
          competencia_month: number
          competencia_year: number
          created_at?: string
          customer_product_id: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          pix_copy_paste?: string | null
          regime: string
          revenue_12m?: number
          revenue_month?: number
          tax_breakdown?: Json
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aliquota_efetiva?: number
          anexo?: string | null
          barcode?: string | null
          competencia_month?: number
          competencia_year?: number
          created_at?: string
          customer_product_id?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          pix_copy_paste?: string | null
          regime?: string
          revenue_12m?: number
          revenue_month?: number
          tax_breakdown?: Json
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financial_das_notifications: {
        Row: {
          channel: string
          created_at: string
          das_guide_id: string
          days_before: number | null
          error_message: string | null
          id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          das_guide_id: string
          days_before?: number | null
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          das_guide_id?: string
          days_before?: number | null
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_das_notifications_das_guide_id_fkey"
            columns: ["das_guide_id"]
            isOneToOne: false
            referencedRelation: "financial_das_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_forecasts: {
        Row: {
          confidence: number | null
          created_at: string
          customer_product_id: string
          daily_series: Json | null
          generated_at: string
          horizon_days: number
          id: string
          method: string
          notes: string | null
          projected_balance: number
          projected_expense: number
          projected_income: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          customer_product_id: string
          daily_series?: Json | null
          generated_at?: string
          horizon_days: number
          id?: string
          method?: string
          notes?: string | null
          projected_balance?: number
          projected_expense?: number
          projected_income?: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          customer_product_id?: string
          daily_series?: Json | null
          generated_at?: string
          horizon_days?: number
          id?: string
          method?: string
          notes?: string | null
          projected_balance?: number
          projected_expense?: number
          projected_income?: number
        }
        Relationships: []
      }
      financial_goal_links: {
        Row: {
          contribution_type: string
          created_at: string
          customer_product_id: string
          goal_id: string
          id: string
          match_type: string
          match_value: string
        }
        Insert: {
          contribution_type?: string
          created_at?: string
          customer_product_id: string
          goal_id: string
          id?: string
          match_type?: string
          match_value: string
        }
        Update: {
          contribution_type?: string
          created_at?: string
          customer_product_id?: string
          goal_id?: string
          id?: string
          match_type?: string
          match_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goal_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_agent_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_insights: {
        Row: {
          created_at: string
          customer_product_id: string
          description: string
          detected_at: string
          id: string
          impact_brl: number | null
          insight_type: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          description: string
          detected_at?: string
          id?: string
          impact_brl?: number | null
          insight_type: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          description?: string
          detected_at?: string
          id?: string
          impact_brl?: number | null
          insight_type?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      financial_kpi_snapshots: {
        Row: {
          avg_ticket: number | null
          burn_rate_monthly: number | null
          cash_balance: number | null
          created_at: string
          customer_product_id: string
          expense_mtd: number | null
          id: string
          metadata: Json | null
          net_margin_pct: number | null
          payables_open: number | null
          receivables_open: number | null
          revenue_mtd: number | null
          runway_months: number | null
          snapshot_date: string
        }
        Insert: {
          avg_ticket?: number | null
          burn_rate_monthly?: number | null
          cash_balance?: number | null
          created_at?: string
          customer_product_id: string
          expense_mtd?: number | null
          id?: string
          metadata?: Json | null
          net_margin_pct?: number | null
          payables_open?: number | null
          receivables_open?: number | null
          revenue_mtd?: number | null
          runway_months?: number | null
          snapshot_date?: string
        }
        Update: {
          avg_ticket?: number | null
          burn_rate_monthly?: number | null
          cash_balance?: number | null
          created_at?: string
          customer_product_id?: string
          expense_mtd?: number | null
          id?: string
          metadata?: Json | null
          net_margin_pct?: number | null
          payables_open?: number | null
          receivables_open?: number | null
          revenue_mtd?: number | null
          runway_months?: number | null
          snapshot_date?: string
        }
        Relationships: []
      }
      financial_notifications: {
        Row: {
          channel: string
          created_at: string
          customer_product_id: string
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          customer_product_id: string
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          customer_product_id?: string
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      financial_quote_items: {
        Row: {
          created_at: string
          description: string
          discount: number
          id: string
          quantity: number
          quote_id: string
          sort_order: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number
          id?: string
          quantity?: number
          quote_id: string
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number
          id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "financial_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_quotes: {
        Row: {
          approved_at: string | null
          client_address: string | null
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          converted_receivable_id: string | null
          created_at: string
          customer_product_id: string
          discount: number
          id: string
          notes: string | null
          quote_number: string
          rejected_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          converted_receivable_id?: string | null
          created_at?: string
          customer_product_id: string
          discount?: number
          id?: string
          notes?: string | null
          quote_number: string
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          converted_receivable_id?: string | null
          created_at?: string
          customer_product_id?: string
          discount?: number
          id?: string
          notes?: string | null
          quote_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      financial_receivable_items: {
        Row: {
          created_at: string
          description: string
          discount: number
          id: string
          quantity: number
          receivable_id: string
          sort_order: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number
          id?: string
          quantity?: number
          receivable_id: string
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number
          id?: string
          quantity?: number
          receivable_id?: string
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_receivable_items_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "financial_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_receivables: {
        Row: {
          client_address: string | null
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          customer_product_id: string
          discount: number
          due_date: string
          id: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          paid_at: string | null
          payment_link: string | null
          payment_method: string | null
          quote_id: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          customer_product_id: string
          discount?: number
          due_date: string
          id?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_link?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          customer_product_id?: string
          discount?: number
          due_date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_link?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_receivables_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "financial_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_recurring_runs: {
        Row: {
          customer_product_id: string
          generated_event_id: string | null
          generated_invoice_id: string | null
          id: string
          notes: string | null
          run_at: string
          run_type: string
          source_event_id: string | null
        }
        Insert: {
          customer_product_id: string
          generated_event_id?: string | null
          generated_invoice_id?: string | null
          id?: string
          notes?: string | null
          run_at?: string
          run_type: string
          source_event_id?: string | null
        }
        Update: {
          customer_product_id?: string
          generated_event_id?: string | null
          generated_invoice_id?: string | null
          id?: string
          notes?: string | null
          run_at?: string
          run_type?: string
          source_event_id?: string | null
        }
        Relationships: []
      }
      financial_report_snapshots: {
        Row: {
          created_at: string
          customer_product_id: string
          generated_by: string | null
          id: string
          payload: Json
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          report_type: string
          title: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          generated_by?: string | null
          id?: string
          payload?: Json
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type: string
          title: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          generated_by?: string | null
          id?: string
          payload?: Json
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          title?: string
        }
        Relationships: []
      }
      financial_tax_calculations: {
        Row: {
          breakdown: Json | null
          created_at: string
          customer_product_id: string
          das_value: number
          deduction: number
          due_date: string
          effective_rate: number
          id: string
          nominal_rate: number
          paid_at: string | null
          payment_status: string
          reference_month: string
          regime: string
          revenue_12m: number
          revenue_month: number
          updated_at: string
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          customer_product_id: string
          das_value?: number
          deduction?: number
          due_date: string
          effective_rate?: number
          id?: string
          nominal_rate?: number
          paid_at?: string | null
          payment_status?: string
          reference_month: string
          regime: string
          revenue_12m?: number
          revenue_month?: number
          updated_at?: string
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          customer_product_id?: string
          das_value?: number
          deduction?: number
          due_date?: string
          effective_rate?: number
          id?: string
          nominal_rate?: number
          paid_at?: string | null
          payment_status?: string
          reference_month?: string
          regime?: string
          revenue_12m?: number
          revenue_month?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_tax_calculations_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_tax_config: {
        Row: {
          auto_calculate: boolean
          cnpj: string | null
          company_name: string | null
          created_at: string
          customer_product_id: string
          id: string
          mei_activity: string | null
          notify_days_before: number
          notify_email: string | null
          notify_whatsapp: string | null
          regime: string
          revenue_12m: number
          simples_anexo: string | null
          updated_at: string
        }
        Insert: {
          auto_calculate?: boolean
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          mei_activity?: string | null
          notify_days_before?: number
          notify_email?: string | null
          notify_whatsapp?: string | null
          regime?: string
          revenue_12m?: number
          simples_anexo?: string | null
          updated_at?: string
        }
        Update: {
          auto_calculate?: boolean
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          mei_activity?: string | null
          notify_days_before?: number
          notify_email?: string | null
          notify_whatsapp?: string | null
          regime?: string
          revenue_12m?: number
          simples_anexo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_tax_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_whatsapp_logs: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          customer_product_id: string
          direction: string
          error_message: string | null
          id: string
          message_text: string | null
          metadata: Json | null
          phone: string | null
          processing_ms: number | null
          status: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          customer_product_id: string
          direction: string
          error_message?: string | null
          id?: string
          message_text?: string | null
          metadata?: Json | null
          phone?: string | null
          processing_ms?: number | null
          status?: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          customer_product_id?: string
          direction?: string
          error_message?: string | null
          id?: string
          message_text?: string | null
          metadata?: Json | null
          phone?: string | null
          processing_ms?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      fleet_budget_audit_results: {
        Row: {
          budget_id: string
          created_at: string
          customer_product_id: string
          economia_potencial: number
          error_message: string | null
          id: string
          items: Json
          metadata: Json | null
          status: string
          total_mercado: number
          total_orcamento: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          customer_product_id: string
          economia_potencial?: number
          error_message?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          status?: string
          total_mercado?: number
          total_orcamento?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          customer_product_id?: string
          economia_potencial?: number
          error_message?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          status?: string
          total_mercado?: number
          total_orcamento?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_budget_audit_results_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "fleet_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_budget_items: {
        Row: {
          budget_id: string
          codigo: string | null
          created_at: string
          descricao: string
          horas: number | null
          id: string
          marca: string | null
          quantidade: number
          sort_order: number
          tipo: string
          tipo_peca: string | null
          valor_hora: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          budget_id: string
          codigo?: string | null
          created_at?: string
          descricao: string
          horas?: number | null
          id?: string
          marca?: string | null
          quantidade?: number
          sort_order?: number
          tipo?: string
          tipo_peca?: string | null
          valor_hora?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          budget_id?: string
          codigo?: string | null
          created_at?: string
          descricao?: string
          horas?: number | null
          id?: string
          marca?: string | null
          quantidade?: number
          sort_order?: number
          tipo?: string
          tipo_peca?: string | null
          valor_hora?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fleet_budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "fleet_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_budgets: {
        Row: {
          comissao_pct: number
          created_at: string
          customer_product_id: string
          id: string
          laudo_tecnico: string | null
          observacoes: string | null
          service_order_id: string
          status: string
          total_bruto: number
          total_liquido: number
          total_mao_de_obra: number
          total_pecas: number
          updated_at: string
          urgencia: string
        }
        Insert: {
          comissao_pct?: number
          created_at?: string
          customer_product_id: string
          id?: string
          laudo_tecnico?: string | null
          observacoes?: string | null
          service_order_id: string
          status?: string
          total_bruto?: number
          total_liquido?: number
          total_mao_de_obra?: number
          total_pecas?: number
          updated_at?: string
          urgencia?: string
        }
        Update: {
          comissao_pct?: number
          created_at?: string
          customer_product_id?: string
          id?: string
          laudo_tecnico?: string | null
          observacoes?: string | null
          service_order_id?: string
          status?: string
          total_bruto?: number
          total_liquido?: number
          total_mao_de_obra?: number
          total_pecas?: number
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_budgets_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "fleet_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_calls: {
        Row: {
          caller_name: string
          caller_role: string
          created_at: string
          customer_product_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          recipient_name: string
          started_at: string | null
          status: string
          workshop_id: string | null
        }
        Insert: {
          caller_name: string
          caller_role: string
          created_at?: string
          customer_product_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recipient_name: string
          started_at?: string | null
          status?: string
          workshop_id?: string | null
        }
        Update: {
          caller_name?: string
          caller_role?: string
          created_at?: string
          customer_product_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recipient_name?: string
          started_at?: string | null
          status?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_calls_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "fleet_partner_workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          id: string
          invite_code: string
          motorista_nome: string | null
          motorista_telefone: string | null
          operator_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          motorista_nome?: string | null
          motorista_telefone?: string | null
          operator_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          motorista_nome?: string | null
          motorista_telefone?: string | null
          operator_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_invites_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "fleet_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_evidence_photos: {
        Row: {
          caption: string | null
          category: string
          created_at: string
          customer_product_id: string
          file_name: string | null
          file_size_bytes: number | null
          id: string
          service_order_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          category?: string
          created_at?: string
          customer_product_id: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          service_order_id: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string
          customer_product_id?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          service_order_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_evidence_photos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "fleet_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          customer_product_id: string
          id: string
          is_read: boolean
          message_text: string
          message_type: string
          recipient_name: string
          sender_name: string
          sender_role: string
          workshop_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          is_read?: boolean
          message_text: string
          message_type?: string
          recipient_name: string
          sender_name: string
          sender_role: string
          workshop_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          is_read?: boolean
          message_text?: string
          message_type?: string
          recipient_name?: string
          sender_name?: string
          sender_role?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_messages_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "fleet_partner_workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_notifications: {
        Row: {
          channel: string
          created_at: string
          customer_product_id: string
          delivered: boolean
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          recipient_role: string
          recipient_user_id: string | null
          sent_at: string | null
          service_order_id: string | null
          stage: string | null
          title: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_product_id: string
          delivered?: boolean
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          recipient_role?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          service_order_id?: string | null
          stage?: string | null
          title: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_product_id?: string
          delivered?: boolean
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          recipient_role?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          service_order_id?: string | null
          stage?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_notifications_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "fleet_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_operators: {
        Row: {
          cidade: string | null
          cnpj: string
          created_at: string
          customer_product_id: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string | null
          status: string
          tamanho_frota: number | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          created_at?: string
          customer_product_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          status?: string
          tamanho_frota?: number | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          created_at?: string
          customer_product_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          status?: string
          tamanho_frota?: number | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_operators_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_partner_workshops: {
        Row: {
          alvara_url: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          banco_agencia: string | null
          banco_conta: string | null
          banco_cpf_cnpj: string | null
          banco_nome: string | null
          banco_tipo_conta: string | null
          banco_titular: string | null
          categorias: string[] | null
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          customer_product_id: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          fachada_url: string | null
          id: string
          nome_fantasia: string | null
          observacoes_admin: string | null
          pix_chave: string | null
          razao_social: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
          valor_hora_tecnica: number | null
        }
        Insert: {
          alvara_url?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_cpf_cnpj?: string | null
          banco_nome?: string | null
          banco_tipo_conta?: string | null
          banco_titular?: string | null
          categorias?: string[] | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          customer_product_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fachada_url?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes_admin?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
          valor_hora_tecnica?: number | null
        }
        Update: {
          alvara_url?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_cpf_cnpj?: string | null
          banco_nome?: string | null
          banco_tipo_conta?: string | null
          banco_titular?: string | null
          categorias?: string[] | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          customer_product_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fachada_url?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes_admin?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
          valor_hora_tecnica?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_partner_workshops_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_price_cache: {
        Row: {
          avg_price: number
          category: string
          created_at: string
          descricao_original: string
          hit_count: number
          id: string
          last_hit_at: string
          max_fair: number
          median_price: number
          min_price: number
          raw_prices: Json | null
          region: string
          scraped_at: string
          search_key: string
          source: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          avg_price?: number
          category?: string
          created_at?: string
          descricao_original: string
          hit_count?: number
          id?: string
          last_hit_at?: string
          max_fair?: number
          median_price?: number
          min_price?: number
          raw_prices?: Json | null
          region?: string
          scraped_at?: string
          search_key: string
          source?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          avg_price?: number
          category?: string
          created_at?: string
          descricao_original?: string
          hit_count?: number
          id?: string
          last_hit_at?: string
          max_fair?: number
          median_price?: number
          min_price?: number
          raw_prices?: Json | null
          region?: string
          scraped_at?: string
          search_key?: string
          source?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fleet_service_cache: {
        Row: {
          created_at: string
          descricao_original: string
          hit_count: number
          horas_ref: number
          id: string
          last_hit_at: string
          region: string
          service_key: string
          source: string
          taxa_max_fair: number
          taxa_media: number
          taxa_minima: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao_original: string
          hit_count?: number
          horas_ref?: number
          id?: string
          last_hit_at?: string
          region?: string
          service_key: string
          source?: string
          taxa_max_fair?: number
          taxa_media?: number
          taxa_minima?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao_original?: string
          hit_count?: number
          horas_ref?: number
          id?: string
          last_hit_at?: string
          region?: string
          service_key?: string
          source?: string
          taxa_max_fair?: number
          taxa_media?: number
          taxa_minima?: number
          updated_at?: string
        }
        Relationships: []
      }
      fleet_service_orders: {
        Row: {
          created_at: string
          customer_product_id: string
          data_entrada: string | null
          data_entrega: string | null
          data_finalizacao: string | null
          data_previsao_entrega: string | null
          descricao_servico: string | null
          id: string
          observacoes: string | null
          oficina_nome: string | null
          stage: string
          updated_at: string
          valor_aprovado: number | null
          valor_orcamento: number | null
          vehicle_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          data_entrada?: string | null
          data_entrega?: string | null
          data_finalizacao?: string | null
          data_previsao_entrega?: string | null
          descricao_servico?: string | null
          id?: string
          observacoes?: string | null
          oficina_nome?: string | null
          stage?: string
          updated_at?: string
          valor_aprovado?: number | null
          valor_orcamento?: number | null
          vehicle_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          data_entrada?: string | null
          data_entrega?: string | null
          data_finalizacao?: string | null
          data_previsao_entrega?: string | null
          descricao_servico?: string | null
          id?: string
          observacoes?: string | null
          oficina_nome?: string | null
          stage?: string
          updated_at?: string
          valor_aprovado?: number | null
          valor_orcamento?: number | null
          vehicle_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_service_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_service_orders_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "fleet_partner_workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          service_order_id: string
          to_stage: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          service_order_id: string
          to_stage: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          service_order_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_stage_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "fleet_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          ano: string | null
          ano_fabricacao: string | null
          ano_modelo: string | null
          chassi: string | null
          combustivel: string | null
          cor: string | null
          created_at: string
          customer_product_id: string
          foto_url: string | null
          id: string
          km_atual: number | null
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          potencia: string | null
          renavam: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ano?: string | null
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          customer_product_id: string
          foto_url?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          potencia?: string | null
          renavam?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ano?: string | null
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          customer_product_id?: string
          foto_url?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          potencia?: string | null
          renavam?: string | null
          status?: string
          updated_at?: string
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
      micro_biz_ai_config: {
        Row: {
          audio_model: string | null
          auto_publish_ads: boolean | null
          business_name: string | null
          business_type: string | null
          chat_model: string | null
          created_at: string
          creative_model: string | null
          customer_product_id: string
          default_budget_cents: number | null
          id: string
          max_tokens: number | null
          system_prompt: string | null
          target_audience_template: Json | null
          temperature: number | null
          updated_at: string
          vision_model: string | null
        }
        Insert: {
          audio_model?: string | null
          auto_publish_ads?: boolean | null
          business_name?: string | null
          business_type?: string | null
          chat_model?: string | null
          created_at?: string
          creative_model?: string | null
          customer_product_id: string
          default_budget_cents?: number | null
          id?: string
          max_tokens?: number | null
          system_prompt?: string | null
          target_audience_template?: Json | null
          temperature?: number | null
          updated_at?: string
          vision_model?: string | null
        }
        Update: {
          audio_model?: string | null
          auto_publish_ads?: boolean | null
          business_name?: string | null
          business_type?: string | null
          chat_model?: string | null
          created_at?: string
          creative_model?: string | null
          customer_product_id?: string
          default_budget_cents?: number | null
          id?: string
          max_tokens?: number | null
          system_prompt?: string | null
          target_audience_template?: Json | null
          temperature?: number | null
          updated_at?: string
          vision_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_ai_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_biz_campaigns: {
        Row: {
          budget_cents: number
          clicks: number | null
          conversions: number | null
          created_at: string
          creative_id: string | null
          customer_product_id: string
          duration_days: number
          ended_at: string | null
          id: string
          impressions: number | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          platform: string
          spend_cents: number | null
          started_at: string | null
          status: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          budget_cents?: number
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          creative_id?: string | null
          customer_product_id: string
          duration_days?: number
          ended_at?: string | null
          id?: string
          impressions?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          platform?: string
          spend_cents?: number | null
          started_at?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          budget_cents?: number
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          creative_id?: string | null
          customer_product_id?: string
          duration_days?: number
          ended_at?: string | null
          id?: string
          impressions?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          platform?: string
          spend_cents?: number | null
          started_at?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_campaigns_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "micro_biz_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_biz_campaigns_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_biz_conversations: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          customer_product_id: string
          direction: string
          id: string
          lead_id: string | null
          message_text: string | null
          message_type: string
          model_used: string | null
          phone: string | null
          processing_ms: number | null
          tokens_used: number | null
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          customer_product_id: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_text?: string | null
          message_type?: string
          model_used?: string | null
          phone?: string | null
          processing_ms?: number | null
          tokens_used?: number | null
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          customer_product_id?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_text?: string | null
          message_type?: string
          model_used?: string | null
          phone?: string | null
          processing_ms?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_conversations_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_biz_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "micro_biz_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_biz_creatives: {
        Row: {
          copy_options: Json | null
          created_at: string
          customer_product_id: string
          flux_model_used: string | null
          id: string
          image_storage_path: string | null
          image_url: string | null
          product_id: string | null
          prompt_used: string | null
          selected_copy: string | null
          status: string
          style_preset: string | null
          updated_at: string
        }
        Insert: {
          copy_options?: Json | null
          created_at?: string
          customer_product_id: string
          flux_model_used?: string | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          product_id?: string | null
          prompt_used?: string | null
          selected_copy?: string | null
          status?: string
          style_preset?: string | null
          updated_at?: string
        }
        Update: {
          copy_options?: Json | null
          created_at?: string
          customer_product_id?: string
          flux_model_used?: string | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          product_id?: string | null
          prompt_used?: string | null
          selected_copy?: string | null
          status?: string
          style_preset?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_creatives_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_biz_creatives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "micro_biz_products"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_biz_leads: {
        Row: {
          company: string | null
          converted_at: string | null
          created_at: string
          customer_product_id: string
          email: string | null
          id: string
          interest: string | null
          is_converted: boolean | null
          last_contact_at: string | null
          name: string | null
          next_step: string | null
          phone: string | null
          purchase_intent_score: number | null
          raw_conversation_summary: string | null
          sentiment: string | null
          source: string
          tags: string[] | null
          total_interactions: number | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          converted_at?: string | null
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          interest?: string | null
          is_converted?: boolean | null
          last_contact_at?: string | null
          name?: string | null
          next_step?: string | null
          phone?: string | null
          purchase_intent_score?: number | null
          raw_conversation_summary?: string | null
          sentiment?: string | null
          source?: string
          tags?: string[] | null
          total_interactions?: number | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          converted_at?: string | null
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          interest?: string | null
          is_converted?: boolean | null
          last_contact_at?: string | null
          name?: string | null
          next_step?: string | null
          phone?: string | null
          purchase_intent_score?: number | null
          raw_conversation_summary?: string | null
          sentiment?: string | null
          source?: string
          tags?: string[] | null
          total_interactions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_leads_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_biz_products: {
        Row: {
          ai_description: Json | null
          ai_vision_analysis: Json | null
          category: string | null
          created_at: string
          customer_product_id: string
          description: string | null
          id: string
          name: string
          photo_storage_path: string | null
          photo_url: string | null
          price: number | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_description?: Json | null
          ai_vision_analysis?: Json | null
          category?: string | null
          created_at?: string
          customer_product_id: string
          description?: string | null
          id?: string
          name: string
          photo_storage_path?: string | null
          photo_url?: string | null
          price?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_description?: Json | null
          ai_vision_analysis?: Json | null
          category?: string | null
          created_at?: string
          customer_product_id?: string
          description?: string | null
          id?: string
          name?: string
          photo_storage_path?: string | null
          photo_url?: string | null
          price?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_biz_products_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
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
      platform_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_stack: string | null
          event_type: string
          function_name: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_stack?: string | null
          event_type?: string
          function_name?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          source?: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_stack?: string | null
          event_type?: string
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string
          status_code?: number | null
          user_id?: string | null
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
      sa_antichurn_alerts: {
        Row: {
          churn_keywords: string[] | null
          churn_probability: number
          company: string | null
          created_at: string
          crm_customer_id: string | null
          customer_name: string | null
          customer_product_id: string
          days_since_contact: number | null
          detected_at: string
          emotional_markers: string[] | null
          engagement_drop_pct: number | null
          executive_summary: string | null
          health_score: number | null
          id: string
          messages_analyzed: number | null
          monthly_value: number | null
          prospect_id: string | null
          recommended_actions: Json
          resolved_at: string | null
          risk_level: string
          sentiment_label: string | null
          sentiment_score: number | null
          signals: Json
          silent_negative: boolean | null
          status: string
          suggested_action: string | null
          updated_at: string
        }
        Insert: {
          churn_keywords?: string[] | null
          churn_probability?: number
          company?: string | null
          created_at?: string
          crm_customer_id?: string | null
          customer_name?: string | null
          customer_product_id: string
          days_since_contact?: number | null
          detected_at?: string
          emotional_markers?: string[] | null
          engagement_drop_pct?: number | null
          executive_summary?: string | null
          health_score?: number | null
          id?: string
          messages_analyzed?: number | null
          monthly_value?: number | null
          prospect_id?: string | null
          recommended_actions?: Json
          resolved_at?: string | null
          risk_level?: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          signals?: Json
          silent_negative?: boolean | null
          status?: string
          suggested_action?: string | null
          updated_at?: string
        }
        Update: {
          churn_keywords?: string[] | null
          churn_probability?: number
          company?: string | null
          created_at?: string
          crm_customer_id?: string | null
          customer_name?: string | null
          customer_product_id?: string
          days_since_contact?: number | null
          detected_at?: string
          emotional_markers?: string[] | null
          engagement_drop_pct?: number | null
          executive_summary?: string | null
          health_score?: number | null
          id?: string
          messages_analyzed?: number | null
          monthly_value?: number | null
          prospect_id?: string | null
          recommended_actions?: Json
          resolved_at?: string | null
          risk_level?: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          signals?: Json
          silent_negative?: boolean | null
          status?: string
          suggested_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_antichurn_alerts_crm_customer_id_fkey"
            columns: ["crm_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_antichurn_alerts_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_antichurn_alerts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_automation_config: {
        Row: {
          antichurn_auto_send: boolean
          created_at: string
          customer_product_id: string
          health_scan_enabled: boolean
          id: string
          updated_at: string
          winback_auto_send: boolean
          winback_min_probability: number
        }
        Insert: {
          antichurn_auto_send?: boolean
          created_at?: string
          customer_product_id: string
          health_scan_enabled?: boolean
          id?: string
          updated_at?: string
          winback_auto_send?: boolean
          winback_min_probability?: number
        }
        Update: {
          antichurn_auto_send?: boolean
          created_at?: string
          customer_product_id?: string
          health_scan_enabled?: boolean
          id?: string
          updated_at?: string
          winback_auto_send?: boolean
          winback_min_probability?: number
        }
        Relationships: []
      }
      sa_cadence_enrollments: {
        Row: {
          cadence_id: string
          converted: boolean | null
          created_at: string
          current_step: number
          customer_product_id: string
          history: Json | null
          id: string
          last_action_at: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          next_action_at: string | null
          opened_count: number | null
          prospect_id: string | null
          replied: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          cadence_id: string
          converted?: boolean | null
          created_at?: string
          current_step?: number
          customer_product_id: string
          history?: Json | null
          id?: string
          last_action_at?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          next_action_at?: string | null
          opened_count?: number | null
          prospect_id?: string | null
          replied?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          cadence_id?: string
          converted?: boolean | null
          created_at?: string
          current_step?: number
          customer_product_id?: string
          history?: Json | null
          id?: string
          last_action_at?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          next_action_at?: string | null
          opened_count?: number | null
          prospect_id?: string | null
          replied?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_cadence_enrollments_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "sa_cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_cadence_enrollments_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_cadence_enrollments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_cadences: {
        Row: {
          active_leads: number | null
          ai_personalization: boolean | null
          completed_leads: number | null
          conversion_rate: number | null
          created_at: string
          customer_product_id: string
          description: string | null
          goal: string | null
          id: string
          is_active: boolean
          messages_replied: number | null
          messages_sent: number | null
          name: string
          open_rate: number | null
          primary_channel: string | null
          reply_rate: number | null
          steps: Json
          target_audience: string | null
          tone: string | null
          total_steps: number
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          active_leads?: number | null
          ai_personalization?: boolean | null
          completed_leads?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_product_id: string
          description?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          messages_replied?: number | null
          messages_sent?: number | null
          name: string
          open_rate?: number | null
          primary_channel?: string | null
          reply_rate?: number | null
          steps?: Json
          target_audience?: string | null
          tone?: string | null
          total_steps?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          active_leads?: number | null
          ai_personalization?: boolean | null
          completed_leads?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_product_id?: string
          description?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          messages_replied?: number | null
          messages_sent?: number | null
          name?: string
          open_rate?: number | null
          primary_channel?: string | null
          reply_rate?: number | null
          steps?: Json
          target_audience?: string | null
          tone?: string | null
          total_steps?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_cadences_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          customer_product_id: string
          default_buffer_min: number | null
          default_duration_min: number | null
          google_email: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          working_hours: Json | null
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          customer_product_id: string
          default_buffer_min?: number | null
          default_duration_min?: number | null
          google_email?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          customer_product_id?: string
          default_buffer_min?: number | null
          default_duration_min?: number | null
          google_email?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      sa_config: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          business_context: string | null
          created_at: string
          customer_product_id: string
          icp_description: string | null
          id: string
          is_active: boolean
          modules_enabled: Json
          updated_at: string
          voice_tone: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          business_context?: string | null
          created_at?: string
          customer_product_id: string
          icp_description?: string | null
          id?: string
          is_active?: boolean
          modules_enabled?: Json
          updated_at?: string
          voice_tone?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          business_context?: string | null
          created_at?: string
          customer_product_id?: string
          icp_description?: string | null
          id?: string
          is_active?: boolean
          modules_enabled?: Json
          updated_at?: string
          voice_tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sa_config_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: true
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_copilot_suggestions: {
        Row: {
          confidence: number | null
          content: string
          context: Json | null
          created_at: string
          customer_product_id: string
          expires_at: string | null
          id: string
          prospect_id: string | null
          status: string
          suggestion_type: string
          title: string
        }
        Insert: {
          confidence?: number | null
          content: string
          context?: Json | null
          created_at?: string
          customer_product_id: string
          expires_at?: string | null
          id?: string
          prospect_id?: string | null
          status?: string
          suggestion_type: string
          title: string
        }
        Update: {
          confidence?: number | null
          content?: string
          context?: Json | null
          created_at?: string
          customer_product_id?: string
          expires_at?: string | null
          id?: string
          prospect_id?: string | null
          status?: string
          suggestion_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_copilot_suggestions_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_copilot_suggestions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_deal_health_scores: {
        Row: {
          created_at: string
          customer_product_id: string
          entity_type: string
          health_score: number
          id: string
          last_calculated_at: string
          lead_id: string | null
          opportunity_id: string | null
          positive_factors: string[] | null
          prospect_id: string | null
          recommended_action: string | null
          risk_factors: string[] | null
          signals: Json
          trend: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          entity_type?: string
          health_score?: number
          id?: string
          last_calculated_at?: string
          lead_id?: string | null
          opportunity_id?: string | null
          positive_factors?: string[] | null
          prospect_id?: string | null
          recommended_action?: string | null
          risk_factors?: string[] | null
          signals?: Json
          trend?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          entity_type?: string
          health_score?: number
          id?: string
          last_calculated_at?: string
          lead_id?: string | null
          opportunity_id?: string | null
          positive_factors?: string[] | null
          prospect_id?: string | null
          recommended_action?: string | null
          risk_factors?: string[] | null
          signals?: Json
          trend?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_deal_health_scores_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_deal_health_scores_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_deal_health_scores_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_meetings: {
        Row: {
          ai_summary: string | null
          calendar_event_id: string | null
          calendar_provider: string | null
          created_at: string
          customer_product_id: string
          deleted_in_google: boolean
          description: string | null
          duration_min: number | null
          duration_minutes: number
          google_calendar_id: string | null
          google_event_id: string | null
          google_synced_at: string | null
          id: string
          lead_email: string | null
          lead_phone: string | null
          meeting_link: string | null
          meeting_url: string | null
          notes: string | null
          opportunity_id: string | null
          outcome: string | null
          prospect_id: string | null
          reminder_email_1h_sent: boolean
          reminder_email_24h_sent: boolean
          reminder_sent: boolean | null
          reminder_whatsapp_1h_sent: boolean
          rescheduled_count: number | null
          scheduled_at: string
          scheduled_by_ai: boolean
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          created_at?: string
          customer_product_id: string
          deleted_in_google?: boolean
          description?: string | null
          duration_min?: number | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          id?: string
          lead_email?: string | null
          lead_phone?: string | null
          meeting_link?: string | null
          meeting_url?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          prospect_id?: string | null
          reminder_email_1h_sent?: boolean
          reminder_email_24h_sent?: boolean
          reminder_sent?: boolean | null
          reminder_whatsapp_1h_sent?: boolean
          rescheduled_count?: number | null
          scheduled_at: string
          scheduled_by_ai?: boolean
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          created_at?: string
          customer_product_id?: string
          deleted_in_google?: boolean
          description?: string | null
          duration_min?: number | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          id?: string
          lead_email?: string | null
          lead_phone?: string | null
          meeting_link?: string | null
          meeting_url?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          prospect_id?: string | null
          reminder_email_1h_sent?: boolean
          reminder_email_24h_sent?: boolean
          reminder_sent?: boolean | null
          reminder_whatsapp_1h_sent?: boolean
          rescheduled_count?: number | null
          scheduled_at?: string
          scheduled_by_ai?: boolean
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_meetings_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_meetings_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_oauth_states: {
        Row: {
          created_at: string
          customer_product_id: string
          expires_at: string
          provider: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          expires_at?: string
          provider?: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          expires_at?: string
          provider?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      sa_prospect_scans: {
        Row: {
          created_at: string
          customer_product_id: string
          error_message: string | null
          finished_at: string | null
          icp_snapshot: string | null
          id: string
          results: Json | null
          sources_used: string[] | null
          status: string
          total_fetched: number | null
          total_hot: number | null
          total_scored: number | null
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          error_message?: string | null
          finished_at?: string | null
          icp_snapshot?: string | null
          id?: string
          results?: Json | null
          sources_used?: string[] | null
          status?: string
          total_fetched?: number | null
          total_hot?: number | null
          total_scored?: number | null
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          error_message?: string | null
          finished_at?: string | null
          icp_snapshot?: string | null
          id?: string
          results?: Json | null
          sources_used?: string[] | null
          status?: string
          total_fetched?: number | null
          total_hot?: number | null
          total_scored?: number | null
        }
        Relationships: []
      }
      sa_prospects: {
        Row: {
          ai_analysis: Json | null
          ai_score: number | null
          company: string | null
          created_at: string
          customer_product_id: string
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          qualification: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_score?: number | null
          company?: string | null
          created_at?: string
          customer_product_id: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          qualification?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_score?: number | null
          company?: string | null
          created_at?: string
          customer_product_id?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          qualification?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_prospects_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_rate_limit: {
        Row: {
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      sa_roleplay_sessions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          created_at: string
          customer_product_id: string
          duration_seconds: number | null
          id: string
          improvements: string[] | null
          persona_name: string
          persona_profile: Json
          scenario: string | null
          status: string
          strengths: string[] | null
          transcript: Json
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          customer_product_id: string
          duration_seconds?: number | null
          id?: string
          improvements?: string[] | null
          persona_name: string
          persona_profile?: Json
          scenario?: string | null
          status?: string
          strengths?: string[] | null
          transcript?: Json
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          customer_product_id?: string
          duration_seconds?: number | null
          id?: string
          improvements?: string[] | null
          persona_name?: string
          persona_profile?: Json
          scenario?: string | null
          status?: string
          strengths?: string[] | null
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_roleplay_sessions_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_trigger_events: {
        Row: {
          created_at: string
          customer_product_id: string
          description: string | null
          detected_at: string
          event_type: string
          id: string
          metadata: Json | null
          prospect_id: string | null
          relevance_score: number | null
          source: string | null
          source_url: string | null
          status: string
          target_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          customer_product_id: string
          description?: string | null
          detected_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          prospect_id?: string | null
          relevance_score?: number | null
          source?: string | null
          source_url?: string | null
          status?: string
          target_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          customer_product_id?: string
          description?: string | null
          detected_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          prospect_id?: string | null
          relevance_score?: number | null
          source?: string | null
          source_url?: string | null
          status?: string
          target_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_trigger_events_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_trigger_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_trigger_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "sa_trigger_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_trigger_targets: {
        Row: {
          company: string | null
          created_at: string
          customer_product_id: string
          id: string
          is_active: boolean
          linkedin_url: string | null
          name: string
          notes: string | null
          position: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          customer_product_id: string
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name: string
          notes?: string | null
          position?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          customer_product_id?: string
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          position?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      sa_winback_campaigns: {
        Row: {
          ai_analysis: Json | null
          campaign_name: string
          channel: string | null
          company: string | null
          created_at: string
          current_step: number
          customer_id: string | null
          customer_product_id: string
          days_since_lost: number | null
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          lost_reason: string | null
          message_sequence: Json
          monthly_value: number | null
          next_send_at: string | null
          opportunity_id: string | null
          prospect_id: string | null
          recovered: boolean
          recovered_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          success_probability: number | null
          suggested_message: string | null
          trigger_psychology: string[] | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          campaign_name: string
          channel?: string | null
          company?: string | null
          created_at?: string
          current_step?: number
          customer_id?: string | null
          customer_product_id: string
          days_since_lost?: number | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lost_reason?: string | null
          message_sequence?: Json
          monthly_value?: number | null
          next_send_at?: string | null
          opportunity_id?: string | null
          prospect_id?: string | null
          recovered?: boolean
          recovered_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          success_probability?: number | null
          suggested_message?: string | null
          trigger_psychology?: string[] | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          campaign_name?: string
          channel?: string | null
          company?: string | null
          created_at?: string
          current_step?: number
          customer_id?: string | null
          customer_product_id?: string
          days_since_lost?: number | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lost_reason?: string | null
          message_sequence?: Json
          monthly_value?: number | null
          next_send_at?: string | null
          opportunity_id?: string | null
          prospect_id?: string | null
          recovered?: boolean
          recovered_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          success_probability?: number | null
          suggested_message?: string | null
          trigger_psychology?: string[] | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_winback_campaigns_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_winback_campaigns_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sa_prospects"
            referencedColumns: ["id"]
          },
        ]
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
      bot_usage_summary: {
        Row: {
          avg_processing_ms: number | null
          customer_product_id: string | null
          last_activity: string | null
          total_data_bytes: number | null
          total_requests: number | null
          total_tokens: number | null
          total_tokens_input: number | null
          total_tokens_output: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_rbt12: {
        Args: { _customer_product_id: string; _ref_date?: string }
        Returns: number
      }
      deliver_order_products: {
        Args: { order_id_param: string }
        Returns: Json
      }
      get_email_by_document: {
        Args: { doc_type: string; doc_value: string }
        Returns: string
      }
      get_revenue_month: {
        Args: { _customer_product_id: string; _month: number; _year: number }
        Returns: number
      }
      goal_recompute_progress: { Args: { _goal_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: { _cp_id: string }; Returns: string }
      next_quote_number: { Args: { _cp_id: string }; Returns: string }
      owns_customer_product: {
        Args: { _customer_product_id: string }
        Returns: boolean
      }
      process_recurring_events: { Args: never; Returns: Json }
      recalc_quote_totals: { Args: { _quote_id: string }; Returns: undefined }
      recalc_receivable_totals: {
        Args: { _rec_id: string }
        Returns: undefined
      }
      search_crm_memories: {
        Args: {
          p_customer_product_id: string
          p_limit?: number
          p_query: string
        }
        Returns: {
          mem_client_name: string
          mem_client_phone: string
          mem_id: string
          mem_interaction_date: string
          mem_raw_message_count: number
          mem_sentiment: string
          mem_summary: string
          mem_topics: string[]
        }[]
      }
      update_expired_trials: { Args: never; Returns: undefined }
      update_overdue_invoices: { Args: never; Returns: Json }
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
