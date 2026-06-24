/**
 * exportPdf — Export trip itinerary to PDF
 * Generates a beautiful, printable travel guide
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  try {
    // Create a temporary container for rendering
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.width = "1200px";
    container.style.backgroundColor = "white";
    container.style.padding = "40px";
    container.style.fontFamily = "Arial, sans-serif";
    document.body.appendChild(container);

    // Generate HTML content
    const startDate = parseISO(trip.startDate);
    const endDate = parseISO(trip.endDate);
    const dayCount = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    let htmlContent = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 36px; margin: 0; color: #0891b2;">${trip.title}</h1>
        <p style="font-size: 16px; color: #666; margin: 10px 0;">
          ${format(startDate, "yyyy年 M月 d日", { locale: zhTW })} - ${format(endDate, "yyyy年 M月 d日", { locale: zhTW })}
        </p>
        <p style="font-size: 14px; color: #999; margin: 5px 0;">
          ${trip.destination} • ${dayCount} 天 • 預算: ${trip.budget?.toLocaleString()} ${trip.currency || "USD"}
        </p>
      </div>

      <div style="page-break-after: always;"></div>
    `;

    // Generate content for each day
    for (let day = 1; day <= dayCount; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day - 1);
      const dayActivities = activitiesByDay[day] || [];

      htmlContent += `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h2 style="font-size: 24px; color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px;">
            Day ${day} - ${format(dayDate, "EEEE, M月 d日", { locale: zhTW })}
          </h2>

          ${dayActivities.length === 0 ? '<p style="color: #999;">無安排活動</p>' : ""}

          ${dayActivities
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map(
              (activity, idx) => `
            <div style="margin: 15px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #0891b2; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h3 style="margin: 0; font-size: 16px; color: #1f2937;">${activity.title}</h3>
                <span style="background-color: #dbeafe; color: #0c4a6e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${getCategoryLabel(activity.category)}
                </span>
              </div>

              ${activity.time ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>時間:</strong> ${activity.time}</p>` : ""}
              ${activity.location ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>地點:</strong> ${activity.location}</p>` : ""}
              ${activity.address ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>地址:</strong> ${activity.address}</p>` : ""}
              ${activity.duration ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>時長:</strong> ${activity.duration} 小時</p>` : ""}
              ${activity.cost != null && activity.cost > 0 ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>費用:</strong> ${activity.cost.toLocaleString()} ${trip.currency || "TWD"}</p>` : ""}
              ${activity.notes ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>備註:</strong> ${activity.notes}</p>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    // Add summary page
    const totalCost = Object.values(activitiesByDay)
      .flat()
      .reduce((sum, a) => sum + (a.cost || 0), 0);

    htmlContent += `
      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="font-size: 24px; color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px;">
          行程摘要
        </h2>

        <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
          <p style="margin: 10px 0; font-size: 16px;">
            <strong>目的地:</strong> ${trip.destination}
          </p>
          <p style="margin: 10px 0; font-size: 16px;">
            <strong>日期:</strong> ${format(startDate, "yyyy年 M月 d日", { locale: zhTW })} - ${format(endDate, "yyyy年 M月 d日", { locale: zhTW })}
          </p>
          <p style="margin: 10px 0; font-size: 16px;">
            <strong>天數:</strong> ${dayCount} 天
          </p>
          <p style="margin: 10px 0; font-size: 16px;">
            <strong>總活動數:</strong> ${Object.values(activitiesByDay).flat().length}
          </p>
          <p style="margin: 10px 0; font-size: 16px;">
            <strong>總費用:</strong> ${totalCost.toLocaleString()} ${trip.currency || "USD"}
          </p>
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
          由 Voyager 旅遊行程規劃 生成 - ${format(new Date(), "yyyy年 M月 d日 HH:mm")}
        </p>
      </div>
    `;

    container.innerHTML = htmlContent;

    // Convert to canvas and then to PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");

    let heightLeft = imgHeight;
    let position = 0;

    // Add pages to PDF
    const imgData = canvas.toDataURL("image/png");
    while (heightLeft >= 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm
      if (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
      }
    }

    // Download PDF
    pdf.save(`${trip.title}-${format(new Date(), "yyyyMMdd")}.pdf`);

    // Clean up
    document.body.removeChild(container);
  } catch (error) {
    console.error("Failed to export PDF:", error);
    throw error;
  }
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
