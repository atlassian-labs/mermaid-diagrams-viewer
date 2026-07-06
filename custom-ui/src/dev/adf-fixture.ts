/**
 * Sample Confluence ADF (Atlassian Document Format) page used during local
 * development.  Add or edit the mermaid fenced code block below to test
 * different diagrams without a real Confluence instance.
 */
export const adfFixture = {
  version: 1,
  type: 'doc',
  content: [
    {
      type: 'codeBlock',
      attrs: { language: 'mermaid' },
      content: [
        {
          type: 'text',
          text: `architecture-beta
  group api(logos:aws-lambda)[API Layer]
  group data(logos:aws-dynamodb)[Data Layer]
  group storage(logos:aws-s3)[Storage Layer]

  service client(logos:chrome)[Browser Client]
  service cdn(aws:cloudfront)[CloudFront]
  service gateway(logos:aws-api-gateway)[API Gateway] in api
  service fn(logos:aws-lambda)[Lambda Function] in api
  service db(logos:aws-dynamodb)[DynamoDB] in data
  service bucket(aws:simple-storage-service-bucket)[S3 Bucket] in storage
  service catalog(aws:datazone-business-data-catalog)[Data Catalog] in data

  client:R --> L:cdn
  cdn:R --> L:gateway
  gateway:R --> L:fn
  fn:R --> L:db
  fn:T --> B:bucket
  db:R --> L:catalog`,
        },
      ],
    },
  ],
};
