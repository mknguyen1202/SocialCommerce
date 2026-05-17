import { authHandlers } from './auth';
import { activityHandlers } from './activity';
import { socialHandlers } from './social';
import { commerceHandlers } from './commerce';
import { communicationHandlers } from './communication';
import { streamingHandlers } from './streaming';
import { profileHandlers } from './profile';
import { sellerHandlers } from './seller';

export const handlers = [
    ...authHandlers,
    ...activityHandlers,
    ...socialHandlers,
    ...sellerHandlers,
    ...commerceHandlers,
    ...communicationHandlers,
    ...streamingHandlers,
    ...profileHandlers,
];
