// src/app/api/ai/code-agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateProjectZip } from "@/ai/tools/code";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectName = "projeto-orvexa", projectType = "react", description, customFiles, download } = body;

    const result = await generateProjectZip({
      projectName,
      projectType,
      description,
      customFiles,
    });

    if (download || req.headers.get("accept") === "application/zip") {
      return new NextResponse(new Uint8Array(result.zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${result.zipFileName}"`,
          "Content-Length": result.zipBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      projectName: result.projectName,
      zipFileName: result.zipFileName,
      filesList: result.filesList,
      totalFiles: result.totalFiles,
      sizeBytes: result.zipBuffer.length,
      base64Zip: result.zipBuffer.toString("base64"),
    });
  } catch (error: any) {
    console.error("[CODE_AGENT_API_ERROR]", error);
    return NextResponse.json(
      { error: "Falha ao gerar projeto de código", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("name") || "projeto-orvexa";
    const projectType = (searchParams.get("type") || "react") as any;
    const description = searchParams.get("desc") || undefined;

    const result = await generateProjectZip({
      projectName,
      projectType,
      description,
    });

    return new NextResponse(new Uint8Array(result.zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.zipFileName}"`,
        "Content-Length": result.zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao baixar projeto ZIP", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
