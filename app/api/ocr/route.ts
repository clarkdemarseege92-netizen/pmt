// ไฟล์: /app/api/ocr/route.ts (ปรับปรุง Regex ภาษาไทย)
import { NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// เริ่มต้น Client
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
    const base64Content = imageBase64.split(",")[1];

    const [result] = await client.textDetection({
      image: { content: base64Content },
    });

    const detections = result.textAnnotations;
    const fullText = detections && detections.length > 0 ? detections[0].description : "";
    
    // Debug Log
    console.log("OCR DEBUG: Full Text:\n", fullText);

    if (!fullText) {
      return NextResponse.json({ text: "", extractedId: null, extractedName: null, success: true });
    }

    let extractedId = null;
    let extractedName = null; 

    if (type === "id_card") {
      // --- 1. ดึงเลขบัตรประชาชน (เหมือนเดิม) ---
      const idMatch = fullText.replace(/[^0-9]/g, "").match(/\d{13}/);
      if (idMatch) extractedId = idMatch[0];

      // --- 2. ดึงชื่อภาษาไทย (Logic ใหม่) ---
      // คำอธิบาย Regex:
      // ชื่อตัวและชื่อสกุล  -> หาคำนำหน้า
      // \s* -> เว้นวรรคกี่ตัวก็ได้ (หรือไม่มีก็ได้)
      // (?:[:.])?        -> อาจจะมีเครื่องหมาย : หรือ . หรือไม่มีก็ได้ (Non-capturing group)
      // \s* -> เว้นวรรคอีกที
      // (.*)             -> ดึงข้อความที่เหลือทั้งหมดในบรรทัดนั้น หรือ บรรทัดถัดไปถ้ามันว่าง
      
      // ค้นหาบรรทัดที่มีคำว่า "ชื่อตัวและชื่อสกุล" และดึงข้อความหลังจากนั้นมาทั้งหมด
      const lineMatch = fullText.match(/ชื่อตัวและชื่อสกุล\s*(?:[:.])?\s*([^\n\r]+)/);

      if (lineMatch && lineMatch[1]) {
          // กรณีที่ 1: ชื่ออยู่บรรทัดเดียวกัน (เช่น "ชื่อตัวและชื่อสกุล นาง บุญยัง...")
          console.log("OCR DEBUG: Found Name on SAME line:", lineMatch[1]);
          extractedName = lineMatch[1].trim();
      } else {
          // กรณีที่ 2: ชื่ออยู่บรรทัดใหม่ (Fallback)
          console.log("OCR DEBUG: Trying NEXT line for Name...");
          const multiLineMatch = fullText.match(/ชื่อตัวและชื่อสกุล\s*[\n\r]+\s*([^\n\r]+)/);
          if (multiLineMatch && multiLineMatch[1]) {
             extractedName = multiLineMatch[1].trim();
          }
      }

      // Clean up: ถ้าดึงมาแล้วมีคำนำหน้า (นาย/นาง/น.ส.) ให้เก็บไว้ ถ้าไม่มีก็เก็บมาทั้งดุ้น
      if (extractedName) {
          // ลองตัดคำแปลภาษาอังกฤษออก ถ้ามันติดมา (เช่น "Mrs. Bunyang")
          // ปกติภาษาไทยจะมาก่อน เราจะเอาแค่ส่วนที่เป็นภาษาไทยถ้าทำได้ แต่เพื่อความปลอดภัยเอาทั้งหมดที่อยู่บรรทัดเดียวกันก่อน
          
          // Log เพื่อดูว่าได้อะไรมา
          console.log("OCR DEBUG: Raw Extracted Name:", extractedName);
      }

    } else if (type === "bank_book") {
      // สมุดบัญชี: หาเลข 10-12 หลัก
      const bankMatch = fullText.replace(/[^0-9]/g, "").match(/\d{10,12}/);
      if (bankMatch) extractedId = bankMatch[0];
    }

    return NextResponse.json({ 
      success: true, 
      fullText: fullText,
      extractedId: extractedId, 
      extractedName: extractedName 
    });

  } catch (error: unknown) {
    console.error("OCR API Error (Final Catch):", error);
    return NextResponse.json({ error: "OCR Service Error" }, { status: 500 });
  }
}