// Supabase Database Types
// Auto-generated from database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_type: 'customer' | 'trainer' | 'admin'
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_type: 'customer' | 'trainer' | 'admin'
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_type?: 'customer' | 'trainer' | 'admin'
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          profile_id: string | null
          age: number | null
          birth_date: string | null
          gender: 'male' | 'female' | 'other' | null
          address: string | null
          address_detail: string | null
          guardian_name: string | null
          guardian_relationship: string | null
          guardian_phone: string | null
          medical_conditions: string[] | null
          mobility_level: 'independent' | 'assisted' | 'wheelchair' | 'bedridden' | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          age?: number | null
          birth_date?: string | null
          gender?: 'male' | 'female' | 'other' | null
          address?: string | null
          address_detail?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          guardian_phone?: string | null
          medical_conditions?: string[] | null
          mobility_level?: 'independent' | 'assisted' | 'wheelchair' | 'bedridden' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          age?: number | null
          birth_date?: string | null
          gender?: 'male' | 'female' | 'other' | null
          address?: string | null
          address_detail?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          guardian_phone?: string | null
          medical_conditions?: string[] | null
          mobility_level?: 'independent' | 'assisted' | 'wheelchair' | 'bedridden' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trainers: {
        Row: {
          id: string
          profile_id: string | null
          bio: string | null
          specialties: string[] | null
          certifications: string[] | null
          years_experience: number | null
          rating: number
          total_reviews: number
          hourly_rate: number | null
          home_visit_available: boolean
          center_visit_available: boolean
          center_address: string | null
          center_name: string | null
          service_areas: string[] | null
          is_verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          bio?: string | null
          specialties?: string[] | null
          certifications?: string[] | null
          years_experience?: number | null
          rating?: number
          total_reviews?: number
          hourly_rate?: number | null
          home_visit_available?: boolean
          center_visit_available?: boolean
          center_address?: string | null
          center_name?: string | null
          service_areas?: string[] | null
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          bio?: string | null
          specialties?: string[] | null
          certifications?: string[] | null
          years_experience?: number | null
          rating?: number
          total_reviews?: number
          hourly_rate?: number | null
          home_visit_available?: boolean
          center_visit_available?: boolean
          center_address?: string | null
          center_name?: string | null
          service_areas?: string[] | null
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          trainer_id: string | null
          title: string
          description: string | null
          duration_minutes: number
          service_type: 'home_visit' | 'center_visit' | 'both'
          max_participants: number
          price_1on1: number | null
          price_1on2: number | null
          price_1on3: number | null
          target_mobility: string[] | null
          benefits: string[] | null
          equipment_needed: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id?: string | null
          title: string
          description?: string | null
          duration_minutes: number
          service_type: 'home_visit' | 'center_visit' | 'both'
          max_participants?: number
          price_1on1?: number | null
          price_1on2?: number | null
          price_1on3?: number | null
          target_mobility?: string[] | null
          benefits?: string[] | null
          equipment_needed?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string | null
          title?: string
          description?: string | null
          duration_minutes?: number
          service_type?: 'home_visit' | 'center_visit' | 'both'
          max_participants?: number
          price_1on1?: number | null
          price_1on2?: number | null
          price_1on3?: number | null
          target_mobility?: string[] | null
          benefits?: string[] | null
          equipment_needed?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_id: string | null
          trainer_id: string | null
          program_id: string | null
          service_type: 'home_visit' | 'center_visit'
          group_size: number
          participant_names: string[] | null
          booking_date: string
          start_time: string
          end_time: string
          duration_minutes: number
          address: string | null
          address_detail: string | null
          price_per_person: number
          total_price: number
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          cancellation_reason: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          customer_notes: string | null
          trainer_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          trainer_id?: string | null
          program_id?: string | null
          service_type: 'home_visit' | 'center_visit'
          group_size?: number
          participant_names?: string[] | null
          booking_date: string
          start_time: string
          end_time: string
          duration_minutes: number
          address?: string | null
          address_detail?: string | null
          price_per_person: number
          total_price: number
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          cancellation_reason?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          customer_notes?: string | null
          trainer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          trainer_id?: string | null
          program_id?: string | null
          service_type?: 'home_visit' | 'center_visit'
          group_size?: number
          participant_names?: string[] | null
          booking_date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          address?: string | null
          address_detail?: string | null
          price_per_person?: number
          total_price?: number
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          cancellation_reason?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          customer_notes?: string | null
          trainer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string | null
          customer_id: string | null
          trainer_id: string | null
          rating: number
          comment: string | null
          professionalism_rating: number | null
          communication_rating: number | null
          effectiveness_rating: number | null
          trainer_response: string | null
          trainer_response_at: string | null
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          customer_id?: string | null
          trainer_id?: string | null
          rating: number
          comment?: string | null
          professionalism_rating?: number | null
          communication_rating?: number | null
          effectiveness_rating?: number | null
          trainer_response?: string | null
          trainer_response_at?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          customer_id?: string | null
          trainer_id?: string | null
          rating?: number
          comment?: string | null
          professionalism_rating?: number | null
          communication_rating?: number | null
          effectiveness_rating?: number | null
          trainer_response?: string | null
          trainer_response_at?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string | null
          customer_id: string | null
          amount: number
          payment_method: string
          payment_key: string | null
          order_id: string | null
          status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded'
          paid_at: string | null
          refunded_at: string | null
          refund_amount: number | null
          refund_reason: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          customer_id?: string | null
          amount: number
          payment_method: string
          payment_key?: string | null
          order_id?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded'
          paid_at?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          customer_id?: string | null
          amount?: number
          payment_method?: string
          payment_key?: string | null
          order_id?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded'
          paid_at?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          message: string
          link: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
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
  }
}
