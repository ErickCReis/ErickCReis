/** @jsx emailElement */
/* oxlint-disable no-unused-vars -- emailElement is referenced by Bun's JSX transform. */

import type { BlogReport } from "@server/blog/report";
import {
  EmailCard,
  EmailHeading,
  EmailLayout,
  EmailText,
  emailElement,
  renderEmail,
} from "@server/email/components";

const reportDateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatReportDate(date: string) {
  return reportDateFormatter.format(new Date(`${date}T12:00:00Z`));
}

function pluralizeReads(views: number) {
  return `${views} ${views === 1 ? "read" : "reads"}`;
}

function getReportPeriod(report: BlogReport) {
  return report.startDate === report.endDate
    ? formatReportDate(report.startDate)
    : `${formatReportDate(report.startDate)} – ${formatReportDate(report.endDate)}`;
}

function BlogReportEmail(props: { report: BlogReport }) {
  const label = props.report.kind === "weekly" ? "Weekly" : "Daily";
  const total = pluralizeReads(props.report.totalViews);
  const period = getReportPeriod(props.report);

  return (
    <EmailLayout preview={`${label} blog report: ${total}`}>
      <EmailCard>
        <EmailHeading>{label} blog report</EmailHeading>
        <EmailText>{period}</EmailText>
        <p
          style={{
            margin: "24px 0",
            "font-family": "Arial, Helvetica, sans-serif",
            "font-size": "18px",
            "line-height": "26px",
            color: "#18181b",
          }}
        >
          <strong>{total}</strong> in total.
        </p>

        {props.report.kind === "weekly" && (
          <EmailText>Saturday: {pluralizeReads(props.report.previousDayViews)}.</EmailText>
        )}

        {props.report.views.length === 0 ? (
          <EmailText>No blog reads were recorded in this period.</EmailText>
        ) : (
          <table
            style={{
              width: "100%",
              "border-collapse": "collapse",
              "font-family": "Arial, Helvetica, sans-serif",
              "font-size": "14px",
            }}
          >
            <thead>
              <tr>
                <th align="left" style={{ padding: "8px 0", "border-bottom": "1px solid #e4e4e7" }}>
                  Post
                </th>
                <th
                  align="right"
                  style={{ padding: "8px 0", "border-bottom": "1px solid #e4e4e7" }}
                >
                  Reads
                </th>
              </tr>
            </thead>
            <tbody>
              {props.report.views.map((row) => (
                <tr>
                  <td style={{ padding: "10px 0", "border-bottom": "1px solid #f4f4f5" }}>
                    {row.slug}
                  </td>
                  <td
                    align="right"
                    style={{ padding: "10px 0", "border-bottom": "1px solid #f4f4f5" }}
                  >
                    {row.views}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EmailCard>
    </EmailLayout>
  );
}

export function renderBlogReport(report: BlogReport) {
  const period = getReportPeriod(report);
  const label = report.kind === "weekly" ? "Weekly" : "Daily";
  const total = pluralizeReads(report.totalViews);
  const rows =
    report.views.length === 0
      ? ["No blog reads were recorded in this period."]
      : report.views.map((row) => `${row.slug}: ${row.views}`);
  const previousDaySummary =
    report.kind === "weekly" ? [`Saturday: ${pluralizeReads(report.previousDayViews)}`, ""] : [];

  return {
    subject: `${label} blog report: ${total}`,
    text: [
      `${label} blog report`,
      period,
      "",
      `Total: ${total}`,
      ...previousDaySummary,
      ...rows,
    ].join("\n"),
    html: renderEmail(() => <BlogReportEmail report={report} />),
  };
}
