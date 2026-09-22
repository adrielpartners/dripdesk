export interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  from?: { email: string; name?: string };
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(params: SendEmailParams): Promise<{ id: string }>;
}
