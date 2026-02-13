export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          location_text: string | null;
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          location_text?: string | null;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          location_text?: string | null;
          role?: "user" | "admin";
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          school_name: string;
          grade: string;
          subject: string | null;
          title: string;
          publisher: string | null;
          edition: string | null;
          condition: "new" | "good" | "marked";
          deal_type: "sale" | "donation";
          price_cents: number | null;
          location_text: string | null;
          delivery_method: "pickup" | "flexible";
          status: "active" | "paused" | "sold" | "donated" | "removed";
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          school_name: string;
          grade: string;
          subject?: string | null;
          title: string;
          publisher?: string | null;
          edition?: string | null;
          condition: "new" | "good" | "marked";
          deal_type: "sale" | "donation";
          price_cents?: number | null;
          location_text?: string | null;
          delivery_method?: "pickup" | "flexible";
          status?: "active" | "paused" | "sold" | "donated" | "removed";
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          school_name?: string;
          grade?: string;
          subject?: string | null;
          title?: string;
          publisher?: string | null;
          edition?: string | null;
          condition?: "new" | "good" | "marked";
          deal_type?: "sale" | "donation";
          price_cents?: number | null;
          location_text?: string | null;
          delivery_method?: "pickup" | "flexible";
          status?: "active" | "paused" | "sold" | "donated" | "removed";
          views_count?: number;
          updated_at?: string;
        };
      };
      listing_photos: {
        Row: {
          id: string;
          listing_id: string;
          url: string;
          path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          url: string;
          path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          url?: string;
          path?: string;
          sort_order?: number;
        };
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status: "open" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status?: "open" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "open" | "closed";
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: never;
      };
      orders: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          amount_cents: number;
          platform_fee_cents: number;
          seller_amount_cents: number;
          fee_percent: number;
          status: "created" | "pending_payment" | "paid" | "canceled" | "refunded" | "completed";
          provider: "stripe" | "mercadopago";
          provider_payment_id: string | null;
          provider_preference_id: string | null;
          checkout_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          amount_cents: number;
          platform_fee_cents?: number;
          seller_amount_cents: number;
          fee_percent?: number;
          status?: "created" | "pending_payment" | "paid" | "canceled" | "refunded" | "completed";
          provider?: "stripe" | "mercadopago";
          provider_payment_id?: string | null;
          provider_preference_id?: string | null;
          checkout_url?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: "created" | "pending_payment" | "paid" | "canceled" | "refunded" | "completed";
          provider_payment_id?: string | null;
          provider_preference_id?: string | null;
          checkout_url?: string | null;
          notes?: string | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          amount_cents: number;
          status: "pending" | "paid" | "failed";
          provider_payout_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          amount_cents: number;
          status?: "pending" | "paid" | "failed";
          provider_payout_id?: string | null;
        };
        Update: {
          status?: "pending" | "paid" | "failed";
          provider_payout_id?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type Listing = Tables<"listings">;
export type ListingPhoto = Tables<"listing_photos">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Favorite = Tables<"favorites">;
export type Order = Tables<"orders">;
export type Payout = Tables<"payouts">;

export type ListingWithPhotos = Listing & {
  listing_photos: ListingPhoto[];
  profiles?: Pick<Profile, "full_name" | "location_text">;
};

export type ConversationWithDetails = Conversation & {
  listings: Pick<Listing, "id" | "title" | "status"> & {
    listing_photos: Pick<ListingPhoto, "url">[];
  };
  buyer: Pick<Profile, "id" | "full_name">;
  seller: Pick<Profile, "id" | "full_name">;
  messages: Message[];
};
