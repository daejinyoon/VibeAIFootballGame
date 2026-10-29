targetScope = 'resourceGroup'

@minLength(3)
@maxLength(63)
param webPubSubName string = 'ydj-football-pvp-${uniqueString(subscription().id, resourceGroup().id)}'

@description('Default hostname of the ydj-football Static Web App. Do not include https://.')
param staticWebAppDefaultHostname string = 'mango-rock-0a79acd00.3.azurestaticapps.net'

var deploymentLocation = 'eastasia'
var cosmosAccountName = 'maze-rescue-ms-b7af62a9'
var footballDatabaseName = 'football'
var pvpContainerName = 'pvp'

resource webPubSub 'Microsoft.SignalRService/webPubSub@2024-03-01' = {
  name: webPubSubName
  location: deploymentLocation
  kind: 'WebPubSub'
  sku: {
    name: 'Free_F1'
    capacity: 1
  }
  properties: {
    disableAadAuth: false
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}

resource pvpHub 'Microsoft.SignalRService/webPubSub/hubs@2024-03-01' = {
  parent: webPubSub
  name: 'football-pvp'
  properties: {
    anonymousConnectPolicy: 'deny'
    eventHandlers: [
      {
        urlTemplate: 'https://${staticWebAppDefaultHostname}/api/pvp/events/{event}'
        userEventPattern: 'pvp-input'
        systemEvents: [
          'disconnected'
        ]
        auth: {
          type: 'None'
        }
      }
    ]
  }
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' existing = {
  name: cosmosAccountName
}

resource footballDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' existing = {
  parent: cosmosAccount
  name: footballDatabaseName
}

resource pvpContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: footballDatabase
  name: pvpContainerName
  properties: {
    resource: {
      id: pvpContainerName
      partitionKey: {
        paths: [
          '/tenantId'
        ]
        kind: 'Hash'
        version: 2
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
      defaultTtl: -1
    }
    options: {
      autoscaleSettings: {
        maxThroughput: 1000
      }
    }
  }
}

output webPubSubResourceId string = webPubSub.id
output webPubSubResourceName string = webPubSub.name
output webPubSubHubName string = pvpHub.name
output pvpContainerResourceId string = pvpContainer.id
