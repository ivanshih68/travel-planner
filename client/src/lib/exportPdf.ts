/**
 * exportPdf — Export trip itinerary to PDF using Native Browser Print API
 * Generates a crisp, selectable, and lightweight vector PDF
 * Features: One Day Per Page + Page Break Protections
 */

import { type Trip, type Activity } from "./api";
import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

interface ActivityByDay {
  [day: number]: Activity[];
}

export async function exportTripToPdf(
  trip: Trip,
  activitiesByDay: ActivityByDay
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 1. 建立一個隱藏的 iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const startDate = parseISO(trip.startDate);
      const endDate = parseISO(trip.endDate);
      const dayCount = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const totalCost = Object.values(activitiesByDay)
        .flat()
        .reduce((sum, a) => sum + (a.cost || 0), 0);

      // 2. 組合原生的 HTML + CSS
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${trip.title} - 行程規劃</title>
          <meta charset="utf-8">
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif; 
              color: #1f2937; 
              line-height: 1.6; 
              padding: 0;
              margin: 0;
            }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { color: #0891b2; font-size: 32px; margin: 0 0 10px 0; }
            .header p { color: #6b7280; font-size: 16px; margin: 5px 0; }
            
            /* 行程天數容器：移除了 page-break-inside: avoid，允許單天行程過多時自然跨頁 */
            .day-container { margin-bottom: 30px; }
            .day-title { 
              font-size: 20px; 
              color: #0891b2; 
              border-bottom: 2px solid #0891b2; 
              padding-bottom: 8px; 
              margin-bottom: 15px; 
            }
            
            /* 單一活動卡片：確保單個活動不會被切成兩半 (一半在上一頁、一半在下一頁) */
            .activity { 
              background-color: #f9fafb; 
              border-left: 4px solid #0891b2; 
              padding: 15px; 
              margin-bottom: 15px; 
              border-radius: 0 8px 8px 0;
              page-break-inside: avoid; 
            }
            .activity-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 8px; 
            }
            .activity-title { font-size: 16px; font-weight: bold; margin: 0; color: #111827; }
            .badge { 
              background-color: #dbeafe; 
              color: #0c4a6e; 
              padding: 4px 8px; 
              border-radius: 6px; 
              font-size: 12px; 
            }
            .info-row { margin: 4px 0; font-size: 13px; color: #4b5563; }
            .info-row strong { color: #374151; }
            
            .summary { 
              background-color: #f0f9ff; 
              padding: 20px; 
              border-radius: 8px; 
              margin-top: 30px;
            }
            .summary h2 { color: #0891b2; margin-top: 0; font-size: 20px; }
            .summary p { margin: 8px 0; font-size: 15px; }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            }
            .empty-day { color: #9ca3af; font-style: italic; font-size: 14px; }
            
            /* 強制換頁的 Class */
            .force-page-break { page-break-before: always; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${trip.title}</h1>
            <p>${format(startDate, "yyyy年 M月 d日", { locale: zhTW })} - ${format(endDate, "yyyy年 M月 d日", { locale: zhTW })}</p>
            <p>${trip.destination} • ${dayCount} 天</p>
          </div>
      `;

      // 3. 插入每天的活動
      for (let day = 1; day <= dayCount; day++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + day - 1);
        const dayActivities = activitiesByDay[day] || [];

        // 【關鍵魔法】如果是第 2 天以後，就加上 force-page-break 讓它強制在新的一頁開始
        const pageBreakClass = day > 1 ? "force-page-break" : "";

        htmlContent += `
          <div class="day-container ${pageBreakClass}">
            <div class="day-title">Day ${day} - ${format(dayDate, "EEEE, M月 d日", { locale: zhTW })}</div>
            ${dayActivities.length === 0 ? '<div class="empty-day">無安排活動</div>' : ""}
        `;

        const sortedActs = [...dayActivities].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        
        sortedActs.forEach(activity => {
          htmlContent += `
            <div class="activity">
              <div class="activity-header">
                <h3 class="activity-title">${activity.title}</h3>
                <span class="badge">${getCategoryLabel(activity.category)}</span>
              </div>
              ${activity.time ? `<div class="info-row"><strong>時間:</strong> ${activity.time}</div>` : ""}
              ${activity.location ? `<div class="info-row"><strong>地點:</strong> ${activity.location}</div>` : ""}
              ${activity.address ? `<div class="info-row"><strong>地址:</strong> ${activity.address}</div>` : ""}
              ${activity.duration ? `<div class="info-row"><strong>時長:</strong> ${activity.duration} 分鐘</div>` : ""}
              ${activity.cost != null && activity.cost > 0 ? `<div class="info-row"><strong>費用:</strong> ${activity.cost.toLocaleString()} ${trip.currency || "TWD"}</div>` : ""}
              ${activity.notes ? `<div class="info-row"><strong>備註:</strong> ${activity.notes}</div>` : ""}
            </div>
          `;
        });

        htmlContent += `</div>`;
      }

      // 4. 插入行程摘要與結尾 (同樣加上 force-page-break 讓摘要也有自己乾淨的一頁)
      htmlContent += `
          <div class="summary force-page-break">
            <h2>行程摘要</h2>
            <p><strong>總活動數:</strong> ${Object.values(activitiesByDay).flat().length} 個項目</p>
            <p><strong>總費用:</strong> ${totalCost.toLocaleString()} ${trip.currency || "USD"}</p>
            <p><strong>預算上限:</strong> ${trip.budget?.toLocaleString() || 0} ${trip.currency || "USD"}</p>
          </div>
          
          <div class="footer">
            由 Voyager 旅遊行程規劃生成 - ${format(new Date(), "yyyy年 M月 d日 HH:mm")}
          </div>
        </body>
        </html>
      `;

      // 5. 寫入並列印
      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("無法建立 PDF 預覽視窗");

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve();
            }, 1000);
          } catch (err) {
            document.body.removeChild(iframe);
            reject(err);
          }
        }, 300);
      };
      
    } catch (error) {
      console.error("PDF 匯出發生錯誤:", error);
      reject(error);
    }
  });
}

function getCategoryLabel(category: string): string {
  const labels: { [key: string]: string } = {
    ATTRACTION: "景點", attraction: "景點",
    RESTAURANT: "餐廳", restaurant: "餐廳",
    HOTEL: "住宿", hotel: "住宿",
    TRANSPORT: "交通", transport: "交通",
    OTHER: "其他", other: "其他",
  };
  return labels[category] || category;
}
