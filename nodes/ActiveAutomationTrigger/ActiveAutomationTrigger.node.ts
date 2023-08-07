import {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ActiveAutomationApi } from './GenericFunctions';

export class ActiveAutomationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Active Automation Trigger',
		name: 'activeAutomationTrigger',
		icon: 'file:rails.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Active Automation events via webhooks',
		defaults: {
			name: 'Active Automation'
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'activeAutomationApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhooks',
			},
		],
		properties: [
			{
				displayName: 'API Endpoint',
				name: 'apiEndpoint',
				type: 'string',
				required: true,
				default: 'http://localhost:3000/automation/api',
				description: 'Endpoint to the Rails user',
			},
			{
				displayName: 'Trigger On',
				name: 'events',
				placeholder: 'Add Event',
				options: [
					{
						name: 'Hello World',
						value: 'hello',
						description: 'Triggers when fired from Active Automation',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			}
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const events = this.getNodeParameter('events') as string[];

				try {
					const { webhooks } = await ActiveAutomationApi.fetchWebhooks(this);

					for (const webhook of webhooks) {
						if (
							webhook.events.every((event: any) => events.includes(event)) &&
							webhookUrl === webhook.url
						) {
							webhookData.webhookId = webhook.id;
							return true;
						}
					}
					// If it did not error then the webhook exists
					return false;
				} catch (err) {
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const events = this.getNodeParameter('events') as string[];

				const responseData = await ActiveAutomationApi.createWebHook(this, events, webhookUrl);

				if (responseData === undefined || responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await ActiveAutomationApi.deleteWebhook(this, webhookData.webhookId as string);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.hookSecret;
				}

				return true;
			},
		},
	};
}
