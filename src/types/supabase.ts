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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          bill_transferred: boolean
          bill_transferred_date: string | null
          category: string
          created_at: string
          date: string
          description: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_auto_tax: boolean
          linked_asset_id: string | null
          notes: string | null
          paid_by: string
          property_id: string
          recurring: boolean
          recurring_freq: string | null
          source_payment_id: string | null
          updated_at: string
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          bill_transferred?: boolean
          bill_transferred_date?: string | null
          category: string
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_auto_tax?: boolean
          linked_asset_id?: string | null
          notes?: string | null
          paid_by?: string
          property_id: string
          recurring?: boolean
          recurring_freq?: string | null
          source_payment_id?: string | null
          updated_at?: string
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          bill_transferred?: boolean
          bill_transferred_date?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_auto_tax?: boolean
          linked_asset_id?: string | null
          notes?: string | null
          paid_by?: string
          property_id?: string
          recurring?: boolean
          recurring_freq?: string | null
          source_payment_id?: string | null
          updated_at?: string
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          id: number
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      index_rates: {
        Row: {
          created_at: string
          id: number
          period_date: string
          type: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          period_date: string
          type: string
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          period_date?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      lease_documents: {
        Row: {
          file_name: string
          id: string
          lease_id: string
          mime_type: string
          size_bytes: number
          stored_name: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          id?: string
          lease_id: string
          mime_type: string
          size_bytes: number
          stored_name: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          id?: string
          lease_id?: string
          mime_type?: string
          size_bytes?: number
          stored_name?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          base_amount: number | null
          base_date: string | null
          check_account: string | null
          check_bank: string | null
          check_branch: string | null
          check_deposit_reminder: boolean
          created_at: string
          deposit_amount: number | null
          early_term_protection: boolean
          end_date: string
          has_option: boolean
          id: string
          landlord_notice_months: number | null
          lease_term: number
          linkage_frequency: string
          linkage_type: string
          monthly_rent: number
          option_activated: boolean
          option_end: string | null
          option_months: number | null
          option_rent: number | null
          option_start: string | null
          option_terms: string | null
          payment_method: string | null
          property_id: string
          renewal_date: string | null
          second_tenant_email: string | null
          second_tenant_first_name: string | null
          second_tenant_id_number: string | null
          second_tenant_last_name: string | null
          second_tenant_phone: string | null
          start_date: string
          status: string
          tenant_id: string
          tenant_notice_months: number | null
          termination_effective_date: string | null
          termination_reason: string | null
          termination_request_date: string | null
          termination_requested_by: string | null
          terms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_amount?: number | null
          base_date?: string | null
          check_account?: string | null
          check_bank?: string | null
          check_branch?: string | null
          check_deposit_reminder?: boolean
          created_at?: string
          deposit_amount?: number | null
          early_term_protection?: boolean
          end_date: string
          has_option?: boolean
          id?: string
          landlord_notice_months?: number | null
          lease_term: number
          linkage_frequency?: string
          linkage_type?: string
          monthly_rent: number
          option_activated?: boolean
          option_end?: string | null
          option_months?: number | null
          option_rent?: number | null
          option_start?: string | null
          option_terms?: string | null
          payment_method?: string | null
          property_id: string
          renewal_date?: string | null
          second_tenant_email?: string | null
          second_tenant_first_name?: string | null
          second_tenant_id_number?: string | null
          second_tenant_last_name?: string | null
          second_tenant_phone?: string | null
          start_date: string
          status?: string
          tenant_id: string
          tenant_notice_months?: number | null
          termination_effective_date?: string | null
          termination_reason?: string | null
          termination_request_date?: string | null
          termination_requested_by?: string | null
          terms?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_amount?: number | null
          base_date?: string | null
          check_account?: string | null
          check_bank?: string | null
          check_branch?: string | null
          check_deposit_reminder?: boolean
          created_at?: string
          deposit_amount?: number | null
          early_term_protection?: boolean
          end_date?: string
          has_option?: boolean
          id?: string
          landlord_notice_months?: number | null
          lease_term?: number
          linkage_frequency?: string
          linkage_type?: string
          monthly_rent?: number
          option_activated?: boolean
          option_end?: string | null
          option_months?: number | null
          option_rent?: number | null
          option_start?: string | null
          option_terms?: string | null
          payment_method?: string | null
          property_id?: string
          renewal_date?: string | null
          second_tenant_email?: string | null
          second_tenant_first_name?: string | null
          second_tenant_id_number?: string | null
          second_tenant_last_name?: string | null
          second_tenant_phone?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_notice_months?: number | null
          termination_effective_date?: string | null
          termination_reason?: string | null
          termination_request_date?: string | null
          termination_requested_by?: string | null
          terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          check_date: string | null
          check_number: string | null
          created_at: string
          deposit_reminder: boolean
          due_date: string
          id: string
          lease_id: string | null
          method: string | null
          notes: string | null
          paid_date: string | null
          partial_paid_amount: number | null
          payment_type: string
          property_id: string
          reference_num: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          check_date?: string | null
          check_number?: string | null
          created_at?: string
          deposit_reminder?: boolean
          due_date: string
          id?: string
          lease_id?: string | null
          method?: string | null
          notes?: string | null
          paid_date?: string | null
          partial_paid_amount?: number | null
          payment_type: string
          property_id: string
          reference_num?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          check_date?: string | null
          check_number?: string | null
          created_at?: string
          deposit_reminder?: boolean
          due_date?: string
          id?: string
          lease_id?: string | null
          method?: string | null
          notes?: string | null
          paid_date?: string | null
          partial_paid_amount?: number | null
          payment_type?: string
          property_id?: string
          reference_num?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          apartment_number: string | null
          balcony_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          country: string
          created_at: string
          description: string | null
          floor: number | null
          house_number: string | null
          id: string
          mortgage_info: string | null
          num_balconies: number | null
          num_parking_spots: number
          property_type: string
          purchase_price: number | null
          square_meters: number | null
          title: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address: string
          apartment_number?: string | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          country?: string
          created_at?: string
          description?: string | null
          floor?: number | null
          house_number?: string | null
          id?: string
          mortgage_info?: string | null
          num_balconies?: number | null
          num_parking_spots?: number
          property_type: string
          purchase_price?: number | null
          square_meters?: number | null
          title: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string
          apartment_number?: string | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          floor?: number | null
          house_number?: string | null
          id?: string
          mortgage_info?: string | null
          num_balconies?: number | null
          num_parking_spots?: number
          property_type?: string
          purchase_price?: number | null
          square_meters?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      property_assets: {
        Row: {
          brand: string | null
          category: string
          condition: string
          created_at: string
          id: string
          model: string | null
          name: string
          notes: string | null
          property_id: string
          purchase_date: string | null
          serial_number: string | null
          updated_at: string
          user_id: string
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          condition?: string
          created_at?: string
          id?: string
          model?: string | null
          name: string
          notes?: string | null
          property_id: string
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id: string
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          notes?: string | null
          property_id?: string
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_utilities: {
        Row: {
          active: boolean
          anchor_month: number | null
          created_at: string
          custom_label: string | null
          frequency: string
          id: string
          property_id: string
          responsibility: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          anchor_month?: number | null
          created_at?: string
          custom_label?: string | null
          frequency?: string
          id?: string
          property_id: string
          responsibility?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          anchor_month?: number | null
          created_at?: string
          custom_label?: string | null
          frequency?: string
          id?: string
          property_id?: string
          responsibility?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_utilities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: number
          plan: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: number
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: number
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          source_payment_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_payment_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_payment_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          employment_info: string | null
          first_name: string
          id: string
          id_number: string | null
          last_name: string
          nationality: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employment_info?: string | null
          first_name: string
          id?: string
          id_number?: string | null
          last_name: string
          nationality?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employment_info?: string | null
          first_name?: string
          id?: string
          id_number?: string | null
          last_name?: string
          nationality?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
