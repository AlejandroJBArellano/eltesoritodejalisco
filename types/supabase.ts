export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string | null
          id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_users"
            columns: ["user_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          close_time?: string
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          phone: string | null
          tenant_id: string
          total_spend: number
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id: string
          loyalty_points?: number
          name: string
          phone?: string | null
          tenant_id: string
          total_spend?: number
          updated_at: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          phone?: string | null
          tenant_id?: string
          total_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cuts: {
        Row: {
          caja_efectivo: number | null
          caja_tarjeta: number | null
          created_at: string | null
          created_by: string | null
          cut_date: string
          cut_type: string | null
          expenses_detail: Json | null
          id: string
          iva_acumulado: number | null
          notes: string | null
          propinas_efectivo: number | null
          propinas_tarjeta: number | null
          tenant_id: string
          total_gastos: number | null
          total_orders: number | null
          utilidad_final: number | null
          utilidad_real: number | null
          venta_neta: number | null
        }
        Insert: {
          caja_efectivo?: number | null
          caja_tarjeta?: number | null
          created_at?: string | null
          created_by?: string | null
          cut_date: string
          cut_type?: string | null
          expenses_detail?: Json | null
          id?: string
          iva_acumulado?: number | null
          notes?: string | null
          propinas_efectivo?: number | null
          propinas_tarjeta?: number | null
          tenant_id: string
          total_gastos?: number | null
          total_orders?: number | null
          utilidad_final?: number | null
          utilidad_real?: number | null
          venta_neta?: number | null
        }
        Update: {
          caja_efectivo?: number | null
          caja_tarjeta?: number | null
          created_at?: string | null
          created_by?: string | null
          cut_date?: string
          cut_type?: string | null
          expenses_detail?: Json | null
          id?: string
          iva_acumulado?: number | null
          notes?: string | null
          propinas_efectivo?: number | null
          propinas_tarjeta?: number | null
          tenant_id?: string
          total_gastos?: number | null
          total_orders?: number | null
          utilidad_final?: number | null
          utilidad_real?: number | null
          venta_neta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_cuts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tips: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          cut_date: string
          id: string
          tenant_id: string
          total_card_tips: number | null
          total_cash_tips: number | null
          total_hours: number | null
          total_tips: number | null
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string | null
          cut_date: string
          id?: string
          tenant_id: string
          total_card_tips?: number | null
          total_cash_tips?: number | null
          total_hours?: number | null
          total_tips?: number | null
        }
        Update: {
          breakdown?: Json | null
          created_at?: string | null
          cut_date?: string
          id?: string
          tenant_id?: string
          total_card_tips?: number | null
          total_cash_tips?: number | null
          total_hours?: number | null
          total_tips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          tipo_gasto: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          tipo_gasto?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          tipo_gasto?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string | null
          description: string
          has_invoice: boolean | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          description: string
          has_invoice?: boolean | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string
          has_invoice?: boolean | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          created_at: string | null
          facturama_id: string | null
          id: string
          order_id: string | null
          pdf_url: string | null
          rfc_receptor: string | null
          status: string | null
          tenant_id: string
          total: number | null
          xml_url: string | null
        }
        Insert: {
          created_at?: string | null
          facturama_id?: string | null
          id?: string
          order_id?: string | null
          pdf_url?: string | null
          rfc_receptor?: string | null
          status?: string | null
          tenant_id: string
          total?: number | null
          xml_url?: string | null
        }
        Update: {
          created_at?: string | null
          facturama_id?: string | null
          id?: string
          order_id?: string | null
          pdf_url?: string | null
          rfc_receptor?: string | null
          status?: string | null
          tenant_id?: string
          total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          tenant_id: string
          tracking_type: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number
          id?: string
          minimum_stock?: number
          name: string
          tenant_id: string
          tracking_type?: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number
          id?: string
          minimum_stock?: number
          name?: string
          tenant_id?: string
          tracking_type?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          show_in_pickup: boolean | null
          sort_order: number | null
          tenant_id: string
          translations: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          show_in_pickup?: boolean | null
          sort_order?: number | null
          tenant_id: string
          translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          show_in_pickup?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          translations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          ingredient_id: string | null
          is_available: boolean
          name: string
          price: number
          show_in_dine_in: boolean | null
          show_in_takeaway: boolean | null
          stripe_product_id: string | null
          tenant_id: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id: string
          image_url?: string | null
          ingredient_id?: string | null
          is_available?: boolean
          name: string
          price: number
          show_in_dine_in?: boolean | null
          show_in_takeaway?: boolean | null
          stripe_product_id?: string | null
          tenant_id: string
          translations?: Json | null
          updated_at: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredient_id?: string | null
          is_available?: boolean
          name?: string
          price?: number
          show_in_dine_in?: boolean | null
          show_in_takeaway?: boolean | null
          stripe_product_id?: string | null
          tenant_id?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_adjustments: {
        Row: {
          created_at: string | null
          id: string
          new_status: string | null
          order_id: string | null
          previous_status: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          status: string | null
          tenant_id: string
          tiempo_preparacion_segundos: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          status?: string | null
          tenant_id: string
          tiempo_preparacion_segundos?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          status?: string | null
          tenant_id?: string
          tiempo_preparacion_segundos?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          closed_at: string | null
          completed_at: string | null
          corte_id: string | null
          created_at: string
          customer_id: string | null
          estado_cierre: string | null
          id: string
          notes: string | null
          operational_date: string
          order_number: string
          pickup_time: string | null
          source: string
          status: Database["public"]["Enums"]["OrderStatus"]
          subtotal: number
          table: string | null
          tax: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          completed_at?: string | null
          corte_id?: string | null
          created_at?: string
          customer_id?: string | null
          estado_cierre?: string | null
          id: string
          notes?: string | null
          operational_date: string
          order_number: string
          pickup_time?: string | null
          source: string
          status?: Database["public"]["Enums"]["OrderStatus"]
          subtotal?: number
          table?: string | null
          tax?: number
          tenant_id: string
          total?: number
          updated_at: string
        }
        Update: {
          closed_at?: string | null
          completed_at?: string | null
          corte_id?: string | null
          created_at?: string
          customer_id?: string | null
          estado_cierre?: string | null
          id?: string
          notes?: string | null
          operational_date?: string
          order_number?: string
          pickup_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["OrderStatus"]
          subtotal?: number
          table?: string | null
          tax?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "daily_cuts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
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
          change: number | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["PaymentMethod"]
          order_id: string
          received_amount: number | null
          tenant_id: string
          tip_amount: number | null
        }
        Insert: {
          amount: number
          change?: number | null
          created_at?: string
          id: string
          method?: Database["public"]["Enums"]["PaymentMethod"]
          order_id: string
          received_amount?: number | null
          tenant_id: string
          tip_amount?: number | null
        }
        Update: {
          amount?: number
          change?: number | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["PaymentMethod"]
          order_id?: string
          received_amount?: number | null
          tenant_id?: string
          tip_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      primordial_tasks: {
        Row: {
          category_id: string | null
          created_at: string | null
          frequency_type: string
          id: string
          is_active: boolean | null
          name: string
          requires_photo: boolean | null
          tenant_id: string
          timeout_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          frequency_type: string
          id?: string
          is_active?: boolean | null
          name: string
          requires_photo?: boolean | null
          tenant_id: string
          timeout_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          frequency_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          requires_photo?: boolean | null
          tenant_id?: string
          timeout_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "primordial_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primordial_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string
          full_name: string | null
          id: string
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          id: string
          ingredient_id: string
          menu_item_id: string
          quantity_required: number
          tenant_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          menu_item_id: string
          quantity_required: number
          tenant_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          quantity_required?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment: number
          created_at: string | null
          id: string
          ingredient_id: string | null
          menu_item_id: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          adjustment: number
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          adjustment?: number
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_executions: {
        Row: {
          approved_at: string | null
          created_at: string | null
          end_time: string | null
          id: string
          last_resumed_at: string | null
          net_duration_minutes: number | null
          paused_seconds: number | null
          photo_url: string | null
          start_time: string | null
          status: string
          task_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          last_resumed_at?: string | null
          net_duration_minutes?: number | null
          paused_seconds?: number | null
          photo_url?: string | null
          start_time?: string | null
          status?: string
          task_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          last_resumed_at?: string | null
          net_duration_minutes?: number | null
          paused_seconds?: number | null
          photo_url?: string | null
          start_time?: string | null
          status?: string
          task_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_executions_profiles"
            columns: ["user_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "task_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "primordial_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          dark_bg_color: string | null
          id: string
          logo_url: string | null
          loyalty_enabled: boolean | null
          loyalty_ratio: number | null
          name: string
          postal_code: string | null
          primary_color: string | null
          regimen_fiscal: string | null
          rfc: string | null
          secondary_color: string | null
          slug: string
          system_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          dark_bg_color?: string | null
          id?: string
          logo_url?: string | null
          loyalty_enabled?: boolean | null
          loyalty_ratio?: number | null
          name: string
          postal_code?: string | null
          primary_color?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          secondary_color?: string | null
          slug: string
          system_name?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          dark_bg_color?: string | null
          id?: string
          logo_url?: string | null
          loyalty_enabled?: boolean | null
          loyalty_ratio?: number | null
          name?: string
          postal_code?: string | null
          primary_color?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          secondary_color?: string | null
          slug?: string
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          password: string
          role: Database["public"]["Enums"]["UserRole"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          password: string
          role?: Database["public"]["Enums"]["UserRole"]
          tenant_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["UserRole"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      popular_menu_items: {
        Row: {
          menu_item_id: string | null
          order_count: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_customer_id?: string
          p_items?: Json
          p_notes?: string
          p_pickup_time?: string
          p_source?: string
          p_table?: string
          p_tenant_id: string
        }
        Returns: string
      }
      fn_deduct_inventory_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      fn_reverse_inventory_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      generar_corte_extemporaneo: {
        Args: { p_cut_date: string; p_tenant_id: string; p_user_id: string }
        Returns: {
          corte_id: string
          total_ordenes: number
          total_ventas: number
        }[]
      }
      get_dashboard_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          active_orders: number
          customers_count: number
          sales_today: number
          tips_today: number
        }[]
      }
      get_user_tenants: { Args: { user_id: string }; Returns: string[] }
    }
    Enums: {
      OrderStatus:
        | "PENDING"
        | "PREPARING"
        | "READY"
        | "DELIVERED"
        | "PAID"
        | "CANCELLED"
        | "UNCOLLECTED"
      PaymentMethod: "CASH" | "CARD" | "TRANSFER" | "OTHER"
      UserRole: "ADMIN" | "MANAGER" | "WAITER" | "CHEF"
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
      OrderStatus: [
        "PENDING",
        "PREPARING",
        "READY",
        "DELIVERED",
        "PAID",
        "CANCELLED",
        "UNCOLLECTED",
      ],
      PaymentMethod: ["CASH", "CARD", "TRANSFER", "OTHER"],
      UserRole: ["ADMIN", "MANAGER", "WAITER", "CHEF"],
    },
  },
} as const

