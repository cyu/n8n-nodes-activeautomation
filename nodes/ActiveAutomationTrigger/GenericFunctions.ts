import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

export namespace ActiveAutomationApi {
	interface WebhookDetails {
		url: string;
		id: number;
		description: string;
		events: string[];
		type: string;
		createdAt: string;
		modifiedAt: string;
	}

	interface WebhookId {
		id: string;
	}

	interface Webhooks {
		webhooks: WebhookDetails[];
	}

	type HTTPMethod = 'GET' | 'POST' | 'DELETE';

	const credentialsName = 'activeAutomationApi';
	export const supportedAuthMap = new Map<string, (ref: IWebhookFunctions) => Promise<string>>([
		[
			'apiKey',
			async (ref: IWebhookFunctions): Promise<string> => {
				const credentials = await ref.getCredentials(credentialsName);
				return credentials.sharedSecret as string;
			},
		],
	]);

	export class Client {
		constructor(readonly ref: IHookFunctions) {}

		get apiEndpoint(): string {
			return this.ref.getNodeParameter('apiEndpoint') as string;
		}

		async request(path: string, method: HTTPMethod, body: any = undefined) {
			const uri = `${this.apiEndpoint}/${path}`;

			const options: OptionsWithUri = {
				uri,
				headers: {
					Accept: 'application/json',
				},
				method,
				body,
			};

			return (await this.ref.helpers.requestWithAuthentication.call(
				this.ref,
				credentialsName,
				options,
			)) as string;
		}
	}

	export const fetchWebhooks = async (ref: IHookFunctions): Promise<Webhooks> => {
		const webhooks = await new Client(ref).request('services/n8n/webhook_subscriptions', 'GET');
		return jsonParse(webhooks);
	};

	export const createWebHook = async (
		ref: IHookFunctions,
		events: string[],
		url: string,
	): Promise<WebhookId> => {
		const webhookId = await new Client(ref).request('services/n8n/webhook_subscriptions', 'POST', {
			webhook_subscription: { events, url },
		});
		return jsonParse(webhookId as string);
	};

	export const deleteWebhook = async (ref: IHookFunctions, webhookId: string) => {
		return await new Client(ref).request(
			`services/n8n/webhook_subscriptions/${webhookId}`,
			'DELETE',
		);
	};
}
