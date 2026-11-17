import type {
  AcademicClass,
  AcademicGroup,
  Chapter,
  FaqItem,
  Notice,
  PaymentMethod,
  Plan,
  QuestionType,
  SiteSettings,
  Subject,
  Topic,
} from '../types/domain';
import { apiRequest } from './apiClient';

export interface AcademicCataloguePayload {
  classes: AcademicClass[];
  groups: AcademicGroup[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  questionTypes: QuestionType[];
}

export interface PublicSitePayload {
  siteSettings: SiteSettings;
  classes: AcademicClass[];
  subjects: Subject[];
  plans: Plan[];
  faqs: FaqItem[];
  notices: Notice[];
  paymentMethods: PaymentMethod[];
  questionTypes: QuestionType[];
}

export const academicService = {
  getAcademicCatalogue(): Promise<AcademicCataloguePayload> {
    return apiRequest('/academic');
  },

  getPublicSiteData(): Promise<PublicSitePayload> {
    return apiRequest('/public/site-data');
  },

  submitContactMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    return apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
