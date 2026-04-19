/**
 * Supabase schema types — manually maintained until we wire up
 * `supabase gen types typescript` against the live project.
 *
 * Mirrors the SQL migrations under supabase/migrations.
 */

export type LoreEntityType =
  | 'city'
  | 'family'
  | 'npc'
  | 'guild'
  | 'creature'
  | 'faction'
  | 'place'
  | 'object'
  | 'deity'
  | 'other';

export type CampaignStatus = 'active' | 'paused' | 'archived';
export type CampaignRole = 'mj' | 'player';
export type LoreTargetType = 'entity' | 'event';

type Rel = never[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Row']>;
        Relationships: Rel;
      };
      campaigns: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          mj_user_id: string;
          status: CampaignStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          mj_user_id: string;
          status?: CampaignStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaigns']['Row']>;
        Relationships: Rel;
      };
      campaign_players: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: CampaignRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role?: CampaignRole;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaign_players']['Row']>;
        Relationships: Rel;
      };
      lore_entities: {
        Row: {
          id: string;
          campaign_id: string;
          type: LoreEntityType;
          name: string;
          description: string | null;
          image_url: string | null;
          is_public: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          type: LoreEntityType;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_public?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lore_entities']['Row']>;
        Relationships: Rel;
      };
      lore_relations: {
        Row: {
          id: string;
          entity_a_id: string;
          entity_b_id: string;
          relation_label: string;
          campaign_id: string;
        };
        Insert: {
          id?: string;
          entity_a_id: string;
          entity_b_id: string;
          relation_label: string;
          campaign_id: string;
        };
        Update: Partial<Database['public']['Tables']['lore_relations']['Row']>;
        Relationships: Rel;
      };
      lore_events: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lore_events']['Row']>;
        Relationships: Rel;
      };
      lore_event_entities: {
        Row: {
          event_id: string;
          entity_id: string;
        };
        Insert: {
          event_id: string;
          entity_id: string;
        };
        Update: Partial<Database['public']['Tables']['lore_event_entities']['Row']>;
        Relationships: Rel;
      };
      lore_player_access: {
        Row: {
          id: string;
          campaign_id: string;
          target_type: LoreTargetType;
          target_id: string;
          user_id: string;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          target_type: LoreTargetType;
          target_id: string;
          user_id: string;
          granted_by: string;
          granted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lore_player_access']['Row']>;
        Relationships: Rel;
      };
      campaign_share_tokens: {
        Row: {
          id: string;
          campaign_id: string;
          token: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          token: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaign_share_tokens']['Row']>;
        Relationships: Rel;
      };
      maps: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          image_url: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          image_url: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['maps']['Row']>;
        Relationships: Rel;
      };
      map_annotations: {
        Row: {
          id: string;
          map_id: string;
          x: number;
          y: number;
          label: string;
          description: string | null;
          linked_entity_id: string | null;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          map_id: string;
          x: number;
          y: number;
          label: string;
          description?: string | null;
          linked_entity_id?: string | null;
          is_public?: boolean;
        };
        Update: Partial<Database['public']['Tables']['map_annotations']['Row']>;
        Relationships: Rel;
      };
      characters: {
        Row: {
          id: string;
          campaign_id: string | null;
          user_id: string;
          character_data: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          user_id: string;
          character_data: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['characters']['Row']>;
        Relationships: Rel;
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_share_token: {
        Args: { p_token: string };
        Returns: string | null;
      };
      public_lore_entities: {
        Args: { p_token: string };
        Returns: Database['public']['Tables']['lore_entities']['Row'][];
      };
      public_lore_relations: {
        Args: { p_token: string };
        Returns: Database['public']['Tables']['lore_relations']['Row'][];
      };
      public_lore_events: {
        Args: { p_token: string };
        Returns: Database['public']['Tables']['lore_events']['Row'][];
      };
      public_maps: {
        Args: { p_token: string };
        Returns: Database['public']['Tables']['maps']['Row'][];
      };
    };
    Enums: {
      lore_entity_type: LoreEntityType;
      campaign_status: CampaignStatus;
      campaign_role: CampaignRole;
      lore_target_type: LoreTargetType;
    };
    CompositeTypes: Record<string, never>;
  };
}
