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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking_participants: {
        Row: {
          attendance_status: string | null
          booking_id: string
          created_at: string | null
          customer_id: string | null
          guest_birth_date: string | null
          guest_email: string | null
          guest_gender: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          paid_at: string | null
          payment_amount: number
          payment_method: string | null
          payment_status: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_status?: string | null
          booking_id: string
          created_at?: string | null
          customer_id?: string | null
          guest_birth_date?: string | null
          guest_email?: string | null
          guest_gender?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_status?: string | null
          booking_id?: string
          created_at?: string | null
          customer_id?: string | null
          guest_birth_date?: string | null
          guest_email?: string | null
          guest_gender?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_participants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          address_detail: string | null
          address_id: string | null
          admin_matched_at: string | null
          admin_matched_by: string | null
          booking_date: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          cancellation_deadline: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          current_participants: number | null
          customer_id: string | null
          customer_notes: string | null
          duration_minutes: number
          end_time: string
          group_size: number | null
          host_customer_id: string | null
          id: string
          is_split_payment: boolean | null
          max_participants: number | null
          participant_names: string[] | null
          price_multiplier: number
          price_per_person: number
          program_id: string | null
          rejection_note: string | null
          rejection_reason:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          service_completed_at: string | null
          service_started_at: string | null
          service_type: string
          session_summary: string | null
          session_type: string | null
          start_time: string
          status: string | null
          total_price: number
          trainer_confirmed_at: string | null
          trainer_id: string | null
          trainer_matched_at: string | null
          trainer_notes: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          address_id?: string | null
          admin_matched_at?: string | null
          admin_matched_by?: string | null
          booking_date: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          cancellation_deadline?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          current_participants?: number | null
          customer_id?: string | null
          customer_notes?: string | null
          duration_minutes: number
          end_time: string
          group_size?: number | null
          host_customer_id?: string | null
          id?: string
          is_split_payment?: boolean | null
          max_participants?: number | null
          participant_names?: string[] | null
          price_multiplier?: number
          price_per_person: number
          program_id?: string | null
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          service_completed_at?: string | null
          service_started_at?: string | null
          service_type: string
          session_summary?: string | null
          session_type?: string | null
          start_time: string
          status?: string | null
          total_price: number
          trainer_confirmed_at?: string | null
          trainer_id?: string | null
          trainer_matched_at?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          address_id?: string | null
          admin_matched_at?: string | null
          admin_matched_by?: string | null
          booking_date?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          cancellation_deadline?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          current_participants?: number | null
          customer_id?: string | null
          customer_notes?: string | null
          duration_minutes?: number
          end_time?: string
          group_size?: number | null
          host_customer_id?: string | null
          id?: string
          is_split_payment?: boolean | null
          max_participants?: number | null
          participant_names?: string[] | null
          price_multiplier?: number
          price_per_person?: number
          program_id?: string | null
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          service_completed_at?: string | null
          service_started_at?: string | null
          service_type?: string
          session_summary?: string | null
          session_type?: string | null
          start_time?: string
          status?: string | null
          total_price?: number
          trainer_confirmed_at?: string | null
          trainer_id?: string | null
          trainer_matched_at?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_admin_matched_by_fkey"
            columns: ["admin_matched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_customer_id_fkey"
            columns: ["host_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          address_detail: string | null
          address_label: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          updated_at: string | null
        }
        Insert: {
          address: string
          address_detail?: string | null
          address_label?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          address_detail?: string | null
          address_label?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_detail: string | null
          age: number | null
          birth_date: string | null
          created_at: string | null
          email_booking_notifications: boolean | null
          email_marketing_notifications: boolean | null
          email_review_notifications: boolean | null
          emergency_contact: string | null
          emergency_phone: string | null
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          medical_conditions: string[] | null
          mobility_level: string | null
          notes: string | null
          profile_id: string | null
          push_booking_notifications: boolean | null
          push_review_notifications: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          age?: number | null
          birth_date?: string | null
          created_at?: string | null
          email_booking_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_review_notifications?: boolean | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          medical_conditions?: string[] | null
          mobility_level?: string | null
          notes?: string | null
          profile_id?: string | null
          push_booking_notifications?: boolean | null
          push_review_notifications?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          age?: number | null
          birth_date?: string | null
          created_at?: string | null
          email_booking_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_review_notifications?: boolean | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          medical_conditions?: string[] | null
          mobility_level?: string | null
          notes?: string | null
          profile_id?: string | null
          push_booking_notifications?: boolean | null
          push_review_notifications?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          booking_cancelled_enabled: boolean | null
          booking_confirmed_enabled: boolean | null
          booking_matched_enabled: boolean | null
          created_at: string | null
          direct_booking_enabled: boolean | null
          id: string
          recommended_booking_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_cancelled_enabled?: boolean | null
          booking_confirmed_enabled?: boolean | null
          booking_matched_enabled?: boolean | null
          created_at?: string | null
          direct_booking_enabled?: boolean | null
          id?: string
          recommended_booking_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_cancelled_enabled?: boolean | null
          booking_confirmed_enabled?: boolean | null
          booking_matched_enabled?: boolean | null
          created_at?: string | null
          direct_booking_enabled?: boolean | null
          id?: string
          recommended_booking_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          applied_policy_id: string | null
          booking_id: string
          cancelled_at: string | null
          card_company: string | null
          card_number_masked: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          paid_at: string | null
          parent_payment_id: string | null
          payment_metadata: Json | null
          payment_method: string
          payment_status: string
          refund_amount: number | null
          refund_policy: string | null
          refund_reason: string | null
          refunded_at: string | null
          requested_at: string | null
          toss_order_id: string
          toss_payment_key: string | null
          toss_transaction_key: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          applied_policy_id?: string | null
          booking_id: string
          cancelled_at?: string | null
          card_company?: string | null
          card_number_masked?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_metadata?: Json | null
          payment_method: string
          payment_status?: string
          refund_amount?: number | null
          refund_policy?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          requested_at?: string | null
          toss_order_id: string
          toss_payment_key?: string | null
          toss_transaction_key?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applied_policy_id?: string | null
          booking_id?: string
          cancelled_at?: string | null
          card_company?: string | null
          card_number_masked?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_metadata?: Json | null
          payment_method?: string
          payment_status?: string
          refund_amount?: number | null
          refund_policy?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          requested_at?: string | null
          toss_order_id?: string
          toss_payment_key?: string | null
          toss_transaction_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_applied_policy"
            columns: ["applied_policy_id"]
            isOneToOne: false
            referencedRelation: "refund_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_detail: string | null
          avatar_url: string | null
          business_license_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          id_card_url: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_type: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          avatar_url?: string | null
          business_license_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          id_card_url?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_type: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          avatar_url?: string | null
          business_license_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_card_url?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          benefits: string[] | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          equipment_needed: string[] | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          price_1on1: number | null
          price_1on2: number | null
          price_1on3: number | null
          service_type: string
          target_mobility: string[] | null
          title: string
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          equipment_needed?: string[] | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          price_1on1?: number | null
          price_1on2?: number | null
          price_1on3?: number | null
          service_type: string
          target_mobility?: string[] | null
          title: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          equipment_needed?: string[] | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          price_1on1?: number | null
          price_1on2?: number | null
          price_1on3?: number | null
          service_type?: string
          target_mobility?: string[] | null
          title?: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_policies: {
        Row: {
          boundary_long_hours: number | null
          boundary_medium_hours: number | null
          boundary_short_hours: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          platform_fee_rate: number | null
          policy_name: string
          refund_rate_24_48h: number | null
          refund_rate_48_72h: number | null
          refund_rate_72h_plus: number | null
          refund_rate_under_24h: number | null
          settlement_waiting_days: number | null
          trainer_cancellation_refund_rate: number | null
          trainer_deposit_required: number | null
          trainer_penalty_rate: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          boundary_long_hours?: number | null
          boundary_medium_hours?: number | null
          boundary_short_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          platform_fee_rate?: number | null
          policy_name?: string
          refund_rate_24_48h?: number | null
          refund_rate_48_72h?: number | null
          refund_rate_72h_plus?: number | null
          refund_rate_under_24h?: number | null
          settlement_waiting_days?: number | null
          trainer_cancellation_refund_rate?: number | null
          trainer_deposit_required?: number | null
          trainer_penalty_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          boundary_long_hours?: number | null
          boundary_medium_hours?: number | null
          boundary_short_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          platform_fee_rate?: number | null
          policy_name?: string
          refund_rate_24_48h?: number | null
          refund_rate_48_72h?: number | null
          refund_rate_72h_plus?: number | null
          refund_rate_under_24h?: number | null
          settlement_waiting_days?: number | null
          trainer_cancellation_refund_rate?: number | null
          trainer_deposit_required?: number | null
          trainer_penalty_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_policies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          communication_rating: number | null
          created_at: string | null
          customer_id: string | null
          effectiveness_rating: number | null
          id: string
          is_hidden: boolean | null
          is_visible: boolean | null
          professionalism_rating: number | null
          rating: number
          trainer_id: string | null
          trainer_response: string | null
          trainer_response_at: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          effectiveness_rating?: number | null
          id?: string
          is_hidden?: boolean | null
          is_visible?: boolean | null
          professionalism_rating?: number | null
          rating: number
          trainer_id?: string | null
          trainer_response?: string | null
          trainer_response_at?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          effectiveness_rating?: number | null
          id?: string
          is_hidden?: boolean | null
          is_visible?: boolean | null
          professionalism_rating?: number | null
          rating?: number
          trainer_id?: string | null
          trainer_response?: string | null
          trainer_response_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          average_rating: number | null
          bank_name: string | null
          bio: string | null
          business_registration_number: string | null
          center_address: string | null
          center_name: string | null
          center_visit_available: boolean | null
          certifications: string[] | null
          created_at: string | null
          education: Json | null
          email_booking_notifications: boolean | null
          email_marketing_notifications: boolean | null
          email_payment_notifications: boolean | null
          email_review_notifications: boolean | null
          home_visit_available: boolean | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_business: boolean | null
          is_verified: boolean | null
          max_group_size: number | null
          profile_id: string | null
          push_booking_notifications: boolean | null
          push_payment_notifications: boolean | null
          push_review_notifications: boolean | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          show_education: boolean | null
          specialties: string[] | null
          total_reviews: number | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          average_rating?: number | null
          bank_name?: string | null
          bio?: string | null
          business_registration_number?: string | null
          center_address?: string | null
          center_name?: string | null
          center_visit_available?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          email_booking_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_payment_notifications?: boolean | null
          email_review_notifications?: boolean | null
          home_visit_available?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_business?: boolean | null
          is_verified?: boolean | null
          max_group_size?: number | null
          profile_id?: string | null
          push_booking_notifications?: boolean | null
          push_payment_notifications?: boolean | null
          push_review_notifications?: boolean | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          show_education?: boolean | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          average_rating?: number | null
          bank_name?: string | null
          bio?: string | null
          business_registration_number?: string | null
          center_address?: string | null
          center_name?: string | null
          center_visit_available?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          email_booking_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_payment_notifications?: boolean | null
          email_review_notifications?: boolean | null
          home_visit_available?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_business?: boolean | null
          is_verified?: boolean | null
          max_group_size?: number | null
          profile_id?: string | null
          push_booking_notifications?: boolean | null
          push_payment_notifications?: boolean | null
          push_review_notifications?: boolean | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          show_education?: boolean | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trainers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_participants_summary: {
        Row: {
          attended_count: number | null
          booking_id: string | null
          guest_count: number | null
          member_count: number | null
          no_show_count: number | null
          paid_count: number | null
          pending_count: number | null
          total_participants: number | null
          total_payment: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_approve_pending_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_trainer_rating: {
        Args: { trainer_uuid: string }
        Returns: number
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      booking_type: "direct" | "recommended"
      rejection_reason:
        | "personal_emergency"
        | "health_issue"
        | "schedule_conflict"
        | "distance_too_far"
        | "customer_requirements"
        | "other"
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
      booking_type: ["direct", "recommended"],
      rejection_reason: [
        "personal_emergency",
        "health_issue",
        "schedule_conflict",
        "distance_too_far",
        "customer_requirements",
        "other",
      ],
    },
  },
} as const
