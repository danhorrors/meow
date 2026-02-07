from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

output = 'output/pdf/crm-additions.pdf'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleLarge', parent=styles['Title'], fontSize=22, leading=26, textColor=colors.HexColor('#114b5f')))
styles.add(ParagraphStyle(name='H2', parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor('#114b5f')))
styles.add(ParagraphStyle(name='H3', parent=styles['Heading3'], fontSize=12, textColor=colors.HexColor('#d86c3a')))
styles.add(ParagraphStyle(name='Body', parent=styles['BodyText'], fontSize=10, leading=14))
styles.add(ParagraphStyle(name='Mono', parent=styles['BodyText'], fontName='Courier', fontSize=9, leading=12))

story = []

story.append(Paragraph('Meow CRM Expansion Documentation', styles['TitleLarge']))
story.append(Paragraph('A deep, practical guide to the new CRM capabilities, email engine, campaigns, scheduling, and integrations.', styles['Body']))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph('<b>Summary:</b> We extended Meow into a full CRM with Leads, Customers, configurable schemas, permissions, conversions, campaigns, Google Workspace (Gmail + Calendar), and Mailgun. The result is faster pipeline execution, consistent outreach, and complete communication history inside Meow.', styles['Body']))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph('Why This Is a Big Upgrade', styles['H2']))
for item in [
    '<b>Full CRM Model.</b> Leads and Customers are first-class entities with configurable fields, ownership, and conversion logic.',
    '<b>Smarter Outreach.</b> Campaigns, Gmail sending, and Mailgun bulk delivery unify outbound communication and log everything directly to the record.',
    '<b>Automation-Ready.</b> Schedule and drip sequences enable sustained engagement while preserving personalization.'
]:
    story.append(Paragraph(item, styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Feature Breakdown', styles['H2']))

sections = [
    ('Leads', 'Leads support email, phone, source, notes, custom fields, and ownership. A lead can be booked into a meeting and automatically converted into an Account with a linked Opportunity.'),
    ('Customers', 'Customers are separate from Accounts for post-sale tracking. They inherit the same configuration features and can be segmented for campaigns or Gmail outreach.'),
    ('Opportunities', 'Opportunities link to Accounts using reference attributes. You can now create an Account directly from an Opportunity.'),
    ('Permissions + Roles', 'Module-level BREAD permissions with role assignment. Admins always have full access. Modules now include Customers, Campaigns, and Emails.'),
    ('Advanced Import Builder', 'Import CSVs with field mapping, defaults for owner and stage, and auto-create Accounts when importing Opportunities.'),
    ('Google Calendar Integration', 'Schedule meetings from lead records. Calendar events are created automatically and the lead is converted at the moment of booking.'),
    ('Google Workspace (Gmail)', 'Each user can connect their Gmail. Send individual emails from a Lead, Customer, Account, or Opportunity and log it in Meow.'),
    ('Mailgun Mass Sender', 'Mailgun handles bulk campaign delivery with tracking and high deliverability while still logging the full email history.'),
    ('Campaigns', 'Build HTML templates, personalize content, define conditions, and schedule bulk sends or drip sequences.'),
    ('Visual Template Builder', 'Drag-and-drop blocks let teams build branded emails fast, with live HTML preview and editable source for advanced tweaks.'),
    ('Schema-Driven Segments', 'Segments are built from your schema fields so every custom attribute becomes a filterable condition.'),
    ('Gmail Inbox Sync', 'Inbound Gmail messages sync into Meow and link to Leads, Customers, or Accounts to complete the communication history.')
]
for title, text in sections:
    story.append(Paragraph(title, styles['H3']))
    story.append(Paragraph(text, styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Backend Configuration', styles['H2']))

story.append(Paragraph('Mailgun', styles['H3']))
story.append(Paragraph('Integration Key: mailgun', styles['Mono']))
story.append(Paragraph('Attributes: domain, apiKey, sender, region', styles['Mono']))

story.append(Paragraph('Google Workspace (Gmail)', styles['H3']))
story.append(Paragraph('Integration Key: google_workspace', styles['Mono']))
story.append(Paragraph('Attributes: clientId, clientSecret, redirectUri', styles['Mono']))

story.append(Paragraph('Google Calendar', styles['H3']))
story.append(Paragraph('Integration Key: google_calendar', styles['Mono']))
story.append(Paragraph('Attributes: clientId, clientSecret, redirectUri, calendarId', styles['Mono']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Data Model (New)', styles['H2']))

table_data = [
    ['Entity', 'Purpose', 'Highlights'],
    ['Lead', 'Pre-sales prospect', 'Contact fields + conversion to Account + Opportunity'],
    ['Customer', 'Post-sale relationship', 'Custom schema + email history + owner'],
    ['Campaign', 'Bulk email outreach', 'Audience filters + schedule + drip steps'],
    ['EmailLog', 'Email audit trail', 'Provider, status, entity link, timestamps']
]

_table = Table(table_data, colWidths=[1.2*inch, 2.0*inch, 2.8*inch])
_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f0ede6')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e3ded4')),
    ('FONT', (0,0), (-1,0), 'Helvetica-Bold'),
    ('VALIGN', (0,0), (-1,-1), 'TOP')
]))
story.append(_table)

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('API Guide (Backend)', styles['H2']))

story.append(Paragraph('Campaigns', styles['H3']))
story.append(Paragraph('GET /api/campaigns', styles['Mono']))
story.append(Paragraph('POST /api/campaigns', styles['Mono']))
story.append(Paragraph('GET /api/campaigns/:id', styles['Mono']))
story.append(Paragraph('DELETE /api/campaigns/:id', styles['Mono']))
story.append(Paragraph('POST /api/campaigns/:id/schedule', styles['Mono']))
story.append(Paragraph('POST /api/campaigns/:id/send', styles['Mono']))

story.append(Paragraph('Email Send + Logs', styles['H3']))
story.append(Paragraph('POST /api/emails', styles['Mono']))
story.append(Paragraph('GET /api/emails?entityType=lead&entityId=...&campaignId=...', styles['Mono']))
story.append(Paragraph('POST /api/emails/sync', styles['Mono']))

story.append(Paragraph('Lead Booking + Conversion', styles['H3']))
story.append(Paragraph('POST /api/leads/:id/book', styles['Mono']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('How to Use: Campaign Example', styles['H2']))
for item in [
    'Create a Campaign with audience entity = Leads.',
    'Add conditions like attributes.source = "Referral".',
    'Write an HTML template using tokens like {{name}}, {{email}}.',
    'Schedule or Send Now.'
]:
    story.append(Paragraph(f'• {item}', styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Personalization Tokens', styles['H2']))

pt_data = [
    ['Token', 'Description'],
    ['{{name}}', 'Entity name'],
    ['{{email}}', 'Primary email'],
    ['{{opportunityName}}', 'Opportunity name (for cards)'],
    ['{{attributes.anyKey}}', 'Custom schema attribute'],
    ['{{account.attributes.anyKey}}', 'Account attributes for opportunity emails']
]
pt_table = Table(pt_data, colWidths=[2.0*inch, 4.0*inch])
pt_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f0ede6')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e3ded4')),
    ('FONT', (0,0), (-1,0), 'Helvetica-Bold'),
]))
story.append(pt_table)

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Segment Builder (Schema-Driven)', styles['H2']))
for item in [
    'Leads where attributes.source = Referral',
    'Customers where attributes.status = At Risk',
    'Opportunities where attributes.accountId exists',
    'Customers where Plan = Enterprise or Renewal Date = This month'
]:
    story.append(Paragraph(f'• {item}', styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Visual Template Builder', styles['H2']))
for item in [
    'Drag blocks for headings, paragraphs, buttons, images, and dividers.',
    'Edit content inline and preview the exact HTML output.',
    'Use the HTML source editor for advanced brand styling.'
]:
    story.append(Paragraph(f'• {item}', styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Gmail Inbox Sync', styles['H2']))
for item in [
    'Sync inbound Gmail messages on demand from User Settings.',
    'Logs include From, To, Subject, body, and received timestamp.',
    'Messages link to the most relevant Lead, Customer, or Account.'
]:
    story.append(Paragraph(f'• {item}', styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Scheduling & Drip Sequences', styles['H2']))
for item in [
    'Day 0: Welcome email',
    'Day 3: Case study',
    'Day 7: Follow-up reminder'
]:
    story.append(Paragraph(f'• {item}', styles['Body']))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph('Why This Works', styles['H2']))
story.append(Paragraph('These additions turn Meow into a high-output CRM: faster conversion, consistent outreach, and complete tracking for every communication. It is not just a UI improvement, it is an operational advantage.', styles['Body']))


doc = SimpleDocTemplate(output, pagesize=LETTER, leftMargin=0.8*inch, rightMargin=0.8*inch, topMargin=0.8*inch, bottomMargin=0.8*inch)
doc.build(story)

print(output)
