// 文件: /app/api/ocr/route.ts
import { NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// 初始化 Google Vision Client
const initializeClient = () => {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.");
  }
  const credentials = JSON.parse(credentialsJson);
  return new ImageAnnotatorClient({
    credentials,
    fallback: false, 
  });
};

export async function POST(request: Request) {
  try {
    const { imageBase64, type } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const client = initializeClient(); 
    // 去掉 data:image/png;base64, 前缀
    const base64Content = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;

    const [result] = await client.textDetection({
      image: { content: base64Content },
    });

    const detections = result.textAnnotations;
    const fullText = detections && detections.length > 0 ? detections[0].description : "";
    
    // 调试日志
    console.log("OCR DEBUG: Raw Text Detected:\n", fullText);

    if (!fullText) {
      return NextResponse.json({ text: "", extractedId: null, extractedName: null, success: true });
    }

    let extractedId: string | null = null;
    let extractedName: string | null = null; 

    if (type === "id_card") {
      // --- 优化身份证号识别 ---
      // 1. 替换常见的 OCR 错误：把字母 'O' 或 'o' 替换为数字 '0'
      // 2. 移除所有非数字字符
      const cleanTextForId = fullText.replace(/[Oo]/g, "0").replace(/[^0-9]/g, "");
      
      // 3. 泰国身份证必须是 13 位数字
      const idMatch = cleanTextForId.match(/\d{13}/);
      if (idMatch) {
          extractedId = idMatch[0];
          console.log("OCR DEBUG: Found ID:", extractedId);
      }

      // --- 优化姓名识别 ---
      // 策略 A: 查找泰语称谓 (最准确)
      const titleRegex = /(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s*([^\n\r0-9]+)/;
      const titleMatch = fullText.match(titleRegex);

      if (titleMatch && titleMatch[0]) {
          extractedName = titleMatch[0].replace(/\s+/g, " ").trim();
          console.log("OCR DEBUG: Found Name via Title:", extractedName);
      } 
      
      // 策略 B: 如果策略 A 失败，尝试查找 "Name" 标签
      if (!extractedName) {
         const labelMatch = fullText.match(/(?:Name|ชื่อตัว|ชื่อสกุล)[^:\n]*[:\s]+([^\n\r0-9]+)/i);
         if (labelMatch && labelMatch[1]) {
             extractedName = labelMatch[1].replace(/Name|Last|Surname/gi, "").trim();
             console.log("OCR DEBUG: Found Name via Label:", extractedName);
         }
      }
    } 
    else if (type === "bank_book") {
      // 银行存折逻辑
      const bankMatch = fullText.replace(/[^0-9]/g, "").match(/\d{10,12}/);
      if (bankMatch) extractedId = bankMatch[0];
    }

    return NextResponse.json({ 
      text: fullText, 
      extractedId, 
      extractedName,
      success: true 
    });

  } catch (error: unknown) { // 【修复】使用 unknown 替代 any
    console.error("OCR API Error:", error);
    
    // 【修复】安全地提取错误信息
    let errorMessage = "OCR Failed";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === "string") {
        errorMessage = error;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}