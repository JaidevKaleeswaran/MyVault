'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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

    await ddb.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: `CATEGORY#${id}` },
    }));

    return resp(200, { success: true, deletedId: id });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return resp(500, { error: err.message });
  }
};
