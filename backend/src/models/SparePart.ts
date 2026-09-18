export interface SparePart {
  id: number;
  part_code: string;
  part_name: string;
  warehouse_name: string;
  stock: number;
  safety_stock: number;
  updated_at?: string;
}
