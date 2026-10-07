import { gql } from "@apollo/client/core";
import type { Severity } from "../domain/cvss";
import type { Source, Status } from "../domain/seed";

export type SortField = "CVSS" | "SEVERITY" | "DETECTED_AT" | "STATUS" | "PROJECT";
export type SortDirection = "ASC" | "DESC";

export interface FindingFilterInput {
  severities?: Severity[];
  statuses?: Status[];
  sources?: Source[];
  projectIds?: string[];
  owasp?: string[];
  search?: string;
}

export interface FindingRow {
  id: string;
  cwe: { id: string; name: string };
  owasp: string;
  source: Source;
  severity: Severity;
  cvssScore: number;
  status: Status;
  project: { id: string; name: string };
  location: string;
  detectedAt: string;
}

export interface FindingDetail extends FindingRow {
  cvssVector: string;
  updatedAt: string;
  history: { from: Status; to: Status; at: string; justification: string | null }[];
}

const ROW = gql`
  fragment FindingRow on Finding {
    id owasp source severity cvssScore status location detectedAt
    cwe { id name }
    project { id name }
  }
`;

export const PROJECTS_QUERY = gql`query Projects { projects { id name } }`;

export const FINDINGS_QUERY = gql`
  query Findings($filter: FindingFilter, $sort: SortField, $direction: SortDirection, $first: Int, $after: String) {
    findings(filter: $filter, sort: $sort, direction: $direction, first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { cursor node { ...FindingRow } }
    }
  }
  ${ROW}
`;
export interface FindingsData {
  findings: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; edges: { cursor: string; node: FindingRow }[] };
}

export const FINDING_QUERY = gql`
  query Finding($id: ID!) {
    finding(id: $id) {
      ...FindingRow
      cvssVector updatedAt
      history { from to at justification }
    }
  }
  ${ROW}
`;

export const SUMMARY_QUERY = gql`
  query Summary($filter: FindingFilter) {
    summary(filter: $filter) {
      total open criticalOpen meanTimeToFixDays
      bySeverity { key count }
      byStatus { key count }
      byOwasp { key count }
    }
  }
`;
export interface CountBy { key: string; count: number }
export interface SummaryData {
  summary: {
    total: number; open: number; criticalOpen: number; meanTimeToFixDays: number | null;
    bySeverity: CountBy[]; byStatus: CountBy[]; byOwasp: CountBy[];
  };
}

export const UPDATE_STATUS = gql`
  mutation UpdateFindingStatus($id: ID!, $status: Status!, $justification: String) {
    updateFindingStatus(id: $id, status: $status, justification: $justification) {
      id status updatedAt
      history { from to at justification }
    }
  }
`;
