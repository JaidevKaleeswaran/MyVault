'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const TABLE = process.env.TABLE_NAME;

const resp = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');

    const item = {
      PK: `USER#${userId}`,
      SK: `TX#${id}`,
      ...body,
      id, // ensure id is consistent with SK
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    const { PK, SK, ...clean } = item;
    return resp(200, { success: true, item: clean });
  } catch (err) {
    console.error('updateTransaction error:', err);
    return resp(500, { error: err.message });
  }
};
