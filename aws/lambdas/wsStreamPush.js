'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const WS_ENDPOINT = process.env.WS_ENDPOINT; // e.g. https://<id>.execute-api.us-west-1.amazonaws.com/prod

exports.handler = async (event) => {
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: WS_ENDPOINT });

  for (const record of event.Records) {
    if (record.eventSource !== 'aws:dynamodb') continue;

    const newImage = record.dynamodb.NewImage;
    const oldImage = record.dynamodb.OldImage;
    const image = newImage || oldImage;
    if (!image) continue;

    const item = unmarshall(image);
    const { PK } = item;

    // Only broadcast user-data changes (skip connection tracking table changes)
    if (!PK || !PK.startsWith('USER#')) continue;

    const userId = PK.replace('USER#', '');
    const eventType = record.eventName; // INSERT | MODIFY | REMOVE

    // Find all active WebSocket connections for this user
    let connections = [];
    try {
      const result = await ddb.send(new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }));
      connections = result.Items || [];
    } catch (err) {
      console.error(`Failed to query connections for user ${userId}:`, err);
      continue;
    }

    if (connections.length === 0) continue;

    const payload = JSON.stringify({
      type: 'SYNC',
      eventType,
      // Strip internal DynamoDB keys before pushing to the client
      item: newImage ? (() => { const { PK: _pk, SK: _sk, ttl: _ttl, ...rest } = unmarshall(newImage); return rest; })() : null,
      oldItem: oldImage ? (() => { const { PK: _pk, SK: _sk, ttl: _ttl, ...rest } = unmarshall(oldImage); return rest; })() : null,
    });

    // Push to all open tabs simultaneously; silently remove stale connections
    await Promise.allSettled(
      connections.map(async ({ connectionId }) => {
        try {
          await wsClient.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(payload),
          }));
        } catch (err) {
          const isGone = err.name === 'GoneException' || err.$metadata?.httpStatusCode === 410;
          if (isGone) {
            // Remove stale connection record
            await ddb.send(new DeleteCommand({
              TableName: CONNECTIONS_TABLE,
              Key: { connectionId },
            })).catch(() => {});
          } else {
            console.error(`Failed to post to connection ${connectionId}:`, err.message);
          }
        }
      })
    );
  }
};
