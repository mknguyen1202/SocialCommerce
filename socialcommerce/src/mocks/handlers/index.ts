import { authHandlers } from './auth';
import { activityHandlers } from './activity';
import { socialHandlers } from './social';
import { commerceHandlers } from './commerce';
import { communicationHandlers } from './communication';
import { streamingHandlers } from './streaming';

export const handlers = [
    ...authHandlers,
    ...activityHandlers,
    ...socialHandlers,
    ...commerceHandlers,
    ...communicationHandlers,
    ...streamingHandlers,
];
