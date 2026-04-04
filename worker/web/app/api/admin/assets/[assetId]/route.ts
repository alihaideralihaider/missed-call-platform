import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset id is required." },
        { status: 400 }
      );
    }

    const { data: asset, error: assetError } = await supabase
      .schema("food_ordering")
      .from("menu_item_assets")
      .select("id, storage_bucket, storage_path")
      .eq("id", assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: "Asset not found." },
        { status: 404 }
      );
    }

    if (asset.storage_bucket && asset.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_path]);

      if (storageError) {
        throw new Error(`Failed to delete storage object: ${storageError.message}`);
      }
    }

    const { error: deleteError } = await supabase
      .schema("food_ordering")
      .from("menu_item_assets")
      .delete()
      .eq("id", assetId);

    if (deleteError) {
      throw new Error(`Failed to delete asset record: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      deletedAssetId: assetId,
      message: "Asset deleted.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/assets/[assetId] failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}