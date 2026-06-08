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
      admin_notifications: {
        Row: {
          created_at: string
          creator_profile_id: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          creator_profile_id: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_activity_reads: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_activity_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          bio: string | null
          created_at: string
          handle: string
          id: string
          profile_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          handle: string
          id?: string
          profile_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          handle?: string
          id?: string
          profile_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_twitch_connections: {
        Row: {
          access_token_encrypted: string
          authorized_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          profile_id: string
          refresh_token_encrypted: string | null
          revoked_at: string | null
          scopes: string[] | null
          subscriber_verification_enabled: boolean | null
          twitch_avatar_url: string | null
          twitch_user_id: string
          twitch_username: string | null
          updated_at: string | null
        }
        Insert: {
          access_token_encrypted: string
          authorized_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id: string
          refresh_token_encrypted?: string | null
          revoked_at?: string | null
          scopes?: string[] | null
          subscriber_verification_enabled?: boolean | null
          twitch_avatar_url?: string | null
          twitch_user_id: string
          twitch_username?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string
          authorized_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id?: string
          refresh_token_encrypted?: string | null
          revoked_at?: string | null
          scopes?: string[] | null
          subscriber_verification_enabled?: boolean | null
          twitch_avatar_url?: string | null
          twitch_user_id?: string
          twitch_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_twitch_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      event_access_codes: {
        Row: {
          code: string
          created_at: string
          event_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          event_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_access_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          is_subscriber: boolean | null
          joined_at: string
          profile_id: string
          status: string
          subscriber_verification_status: string | null
          subscriber_verified_at: string | null
          subscription_source: string | null
          subscription_tier: string | null
        }
        Insert: {
          event_id: string
          id?: string
          is_subscriber?: boolean | null
          joined_at?: string
          profile_id: string
          status?: string
          subscriber_verification_status?: string | null
          subscriber_verified_at?: string | null
          subscription_source?: string | null
          subscription_tier?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          is_subscriber?: boolean | null
          joined_at?: string
          profile_id?: string
          status?: string
          subscriber_verification_status?: string | null
          subscriber_verified_at?: string | null
          subscription_source?: string | null
          subscription_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_players: {
        Row: {
          country_code: string | null
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          seed: number | null
          sort_order: number
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          seed?: number | null
          sort_order?: number
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          seed?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_prizes: {
        Row: {
          amount: number | null
          assignment_method: string
          created_at: string
          currency: string | null
          description: string | null
          eligibility_type: string
          eligible_rank_start: number
          event_id: string
          id: string
          label: string
          prize_category: string
          quantity: number
          sort_order: number
          tier: string | null
        }
        Insert: {
          amount?: number | null
          assignment_method?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          eligibility_type: string
          eligible_rank_start?: number
          event_id: string
          id?: string
          label: string
          prize_category: string
          quantity?: number
          sort_order: number
          tier?: string | null
        }
        Update: {
          amount?: number | null
          assignment_method?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          eligibility_type?: string
          eligible_rank_start?: number
          event_id?: string
          id?: string
          label?: string
          prize_category?: string
          quantity?: number
          sort_order?: number
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_prizes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          config: Json
          created_at: string
          creator_id: string
          description: string | null
          dynamic_type_id: string
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          creator_id: string
          description?: string | null
          dynamic_type_id: string
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          creator_id?: string
          description?: string | null
          dynamic_type_id?: string
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_dynamic_type_id_fkey"
            columns: ["dynamic_type_id"]
            isOneToOne: false
            referencedRelation: "dynamic_types"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          dynamic_type_id: string
          ends_at: string | null
          event_config: Json
          id: string
          is_public: boolean
          logo_url: string | null
          max_participants: number | null
          predictions_close_timezone: string
          prize_stacking_policy: string
          scoring_config: Json
          slug: string
          starts_at: string | null
          status: string
          template_id: string | null
          title: string
          twitch_channel: string | null
            receipt_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          dynamic_type_id: string
          ends_at?: string | null
          event_config?: Json
          id?: string
          is_public?: boolean
          logo_url?: string | null
          max_participants?: number | null
          predictions_close_timezone?: string
          prize_stacking_policy?: string
          scoring_config?: Json
          slug: string
          starts_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          twitch_channel?: string | null
            receipt_template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          dynamic_type_id?: string
          ends_at?: string | null
          event_config?: Json
          id?: string
          is_public?: boolean
          logo_url?: string | null
          max_participants?: number | null
          predictions_close_timezone?: string
          prize_stacking_policy?: string
          scoring_config?: Json
          slug?: string
          starts_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          twitch_channel?: string | null
            receipt_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_dynamic_type_id_fkey"
            columns: ["dynamic_type_id"]
            isOneToOne: false
            referencedRelation: "dynamic_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          event_id: string
          id: string
          metadata: Json
          profile_id: string
          rank: number | null
          total_score: number
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          metadata?: Json
          profile_id: string
          rank?: number | null
          total_score?: number
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          metadata?: Json
          profile_id?: string
          rank?: number | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_results: {
        Row: {
          correct_option_id: string
          created_at: string
          event_id: string
          id: string
          is_final: boolean
          pickem_option_id: string
          updated_at: string
        }
        Insert: {
          correct_option_id: string
          created_at?: string
          event_id: string
          id?: string
          is_final?: boolean
          pickem_option_id: string
          updated_at?: string
        }
        Update: {
          correct_option_id?: string
          created_at?: string
          event_id?: string
          id?: string
          is_final?: boolean
          pickem_option_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_results_pickem_option_id_fkey"
            columns: ["pickem_option_id"]
            isOneToOne: false
            referencedRelation: "pickem_options"
            referencedColumns: ["id"]
          },
        ]
      }
      pickem_options: {
        Row: {
          correct_option_id: string | null
          created_at: string
          event_id: string
          id: string
          label: string
          options: Json
          points: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          correct_option_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          label: string
          options?: Json
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          correct_option_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          label?: string
          options?: Json
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickem_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_answers: {
        Row: {
          created_at: string
          id: string
          option_id: string
          position: number | null
          question_id: string
          selected_order: number | null
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          position?: number | null
          question_id: string
          selected_order?: number | null
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          position?: number | null
          question_id?: string
          selected_order?: number | null
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "prediction_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_options: {
        Row: {
          created_at: string
          id: string
          label: string
          player_id: string | null
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          player_id?: string | null
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          player_id?: string | null
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "prediction_options_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "event_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_questions: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          max_selections: number | null
          pick_type: string
          points_per_correct: number
          question_type: string
          sort_order: number
          template_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          max_selections?: number | null
          pick_type?: string
          points_per_correct?: number
          question_type: string
          sort_order?: number
          template_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          max_selections?: number | null
          pick_type?: string
          points_per_correct?: number
          question_type?: string
          sort_order?: number
          template_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_results: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          is_correct: boolean
          option_id: string
          position: number | null
          question_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          is_correct?: boolean
          option_id: string
          position?: number | null
          question_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          is_correct?: boolean
          option_id?: string
          position?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_results_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "prediction_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_results_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_scores: {
        Row: {
          correct_count: number
          created_at: string
          event_id: string
          id: string
          profile_id: string
          question_id: string
          submission_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          event_id: string
          id?: string
          profile_id: string
          question_id: string
          submission_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          event_id?: string
          id?: string
          profile_id?: string
          question_id?: string
          submission_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_winners: {
        Row: {
          claimed_at: string | null
          created_at: string
          event_prize_id: string
          id: string
          profile_id: string
          rank_achieved: number | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          event_prize_id: string
          id?: string
          profile_id: string
          rank_achieved?: number | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          event_prize_id?: string
          id?: string
          profile_id?: string
          rank_achieved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prize_winners_event_prize_id_fkey"
            columns: ["event_prize_id"]
            isOneToOne: false
            referencedRelation: "event_prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_winners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          role: string
          twitch_username: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_active?: boolean
          role?: string
          twitch_username?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          twitch_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raffle_entries: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          raffle_id: string
          ticket_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          raffle_id: string
          ticket_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          raffle_id?: string
          ticket_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_entries_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_winners: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          prize_position: number
          profile_id: string
          raffle_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          prize_position: number
          profile_id: string
          raffle_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          prize_position?: number
          profile_id?: string
          raffle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_winners_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          created_at: string
          draw_at: string | null
          drawn_at: string | null
          event_id: string
          id: string
          prize_description: string
          prize_image_url: string | null
          updated_at: string
          winner_count: number
        }
        Insert: {
          created_at?: string
          draw_at?: string | null
          drawn_at?: string | null
          event_id: string
          id?: string
          prize_description: string
          prize_image_url?: string | null
          updated_at?: string
          winner_count?: number
        }
        Update: {
          created_at?: string
          draw_at?: string | null
          drawn_at?: string | null
          event_id?: string
          id?: string
          prize_description?: string
          prize_image_url?: string | null
          updated_at?: string
          winner_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "raffles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_assets: {
        Row: {
          created_at: string
          event_id: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          profile_id: string
          storage_path: string
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          profile_id: string
          storage_path: string
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          profile_id?: string
          storage_path?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_assets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_assets_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          config: Json
          created_at: string
          event_id: string
          id: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          event_id: string
          id?: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          event_id?: string
          id?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_items: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          pickem_option_id: string
          points_earned: number | null
          selected_option_id: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          pickem_option_id: string
          points_earned?: number | null
          selected_option_id?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          pickem_option_id?: string
          points_earned?: number | null
          selected_option_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_items_pickem_option_id_fkey"
            columns: ["pickem_option_id"]
            isOneToOne: false
            referencedRelation: "pickem_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          participant_id: string
          status: string
          submitted_at: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          participant_id: string
          status?: string
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          participant_id?: string
          status?: string
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "event_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tiebreaker_draws: {
        Row: {
          created_at: string
          draw_order: number
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          draw_order: number
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          draw_order?: number
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiebreaker_draws_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreaker_draws_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      twitch_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          is_connected: boolean
          profile_id: string
          refresh_token: string | null
          scopes: Json
          token_expires_at: string | null
          twitch_display_name: string | null
          twitch_user_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          is_connected?: boolean
          profile_id: string
          refresh_token?: string | null
          scopes?: Json
          token_expires_at?: string | null
          twitch_display_name?: string | null
          twitch_user_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          profile_id?: string
          refresh_token?: string | null
          scopes?: Json
          token_expires_at?: string | null
          twitch_display_name?: string | null
          twitch_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitch_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_creator_profile: {
        Args: { p_bio?: string; p_handle: string; p_profile_id: string }
        Returns: undefined
      }
      get_creator_profile: { Args: { p_profile_id: string }; Returns: Json }
      get_event_leaderboard: {
        Args: { p_event_id: string }
        Returns: {
          correct_answers: number
          display_name: string
          profile_id: string
          rank: number
          total_questions: number
          total_score: number
        }[]
      }
      has_active_sub_verification: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      apply_pickem_prize_assignments: {
        Args: { p_event_id: string; p_assignments: Json }
        Returns: undefined
      }
      is_event_creator: { Args: { p_event_id: string }; Returns: boolean }
      sync_twitch_from_auth: {
        Args: { profile_id: string }
        Returns: undefined
      }
      upsert_event_prize:
        | {
            Args: {
              p_amount?: number
              p_assignment_method?: string
              p_currency?: string
              p_description?: string
              p_eligibility_type?: string
              p_eligible_rank_start?: number
              p_event_id: string
              p_label?: string
              p_quantity?: number
              p_sort_order?: number
              p_tier?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount?: number
              p_currency?: string
              p_description?: string
              p_event_id: string
              p_label: string
              p_quantity?: number
              p_tier: string
            }
            Returns: Json
          }
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
