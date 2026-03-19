import { randomUUID } from 'crypto';
import { scrapeDomain } from '../scraper/domainScraper';
import { generatePrompts } from '../prompts/promptGenerator';
import { AuditInitResult } from '../prompts/types';
import { logger } from '../../utils/logger';

export interface AuditInitInput {
  domain: string;
  keywords?: string[];
  businessType: 'saas' | 'local_business';
}

export async function runAuditInit(input: AuditInitInput): Promise<AuditInitResult> {
  const { domain, keywords = [], businessType } = input;
  const auditId = randomUUID();

  logger.info('Running audit init', { auditId, domain, businessType });

  const scraped = await scrapeDomain(domain);

  const { prompts, warnings, missingDataFlags } = generatePrompts(
    scraped,
    keywords,
    businessType,
  );

  const result: AuditInitResult = {
    scrapingResults: {
      companyName: scraped.companyName,
      domain: scraped.domain,
      detectedBusinessType: scraped.detectedBusinessType,
      userSelectedBusinessType: businessType,
      businessTypeMatch: scraped.detectedBusinessType === businessType,
      businessTypeSignals: scraped.businessTypeSignals,
      location: scraped.location,
      servicesFound: scraped.services,
      keywordsFromUser: keywords,
      pricingPageFound: scraped.pricingPageFound,
      schemaTypes: scraped.schemaTypes,
      pagesScraped: scraped.pagesScraped,
      scrapedAt: scraped.scrapedAt,
      warnings,
    },
    prompts,
    auditId,
    status: missingDataFlags.length > 0 ? 'missing_data' : 'ready',
    missingDataFlags,
  };

  logger.info('Audit init completed', {
    auditId,
    promptCount: prompts.length,
    warnings: warnings.length,
    status: result.status,
  });

  return result;
}
