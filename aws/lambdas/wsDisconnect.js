'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await ddb.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    }));

    console.log(`WebSocket DISCONNECT: connectionId=${connectionId}`);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (err) {
    console.error('wsDisconnect error:', err);
    // Return 200 even on error — API Gateway ignores disconnect response codes
    return { statusCode: 200, body: 'Disconnected (with error)' };
  }
};
