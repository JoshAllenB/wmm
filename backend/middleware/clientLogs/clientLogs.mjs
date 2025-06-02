import LogModel from '../../models/userControl/LogSchema.mjs'

//Helper function to compare objec tand find changes
const findChanges = (oldData, newData) => {
    const changes = [];
    const keys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];

    for (const key of keys) {
        if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;
        if (typeof oldData[key] === 'object' || typeof newData[key] === 'object') continue;

        if (oldData[key] !== newData[key]) {
            changes.push({
                field:key,
                oldValue: oldData[key],
                newValue: newData[key]
            });
        }
    }
    return changes;
};

//Log creation of New Client
export const logClientCreation = async (userId, clientData) => {
    try{
        const log = new LogModel({
            clientId: clientData.id,
            userId: userId,
            action: 'create',
            changes: Object.entries(clientData).filter(([key]) => !['_id', 'createdAt', 'updatedAt'].includes(key))
            .map(([key, value]) => ({
                field: key,
                oldValue: null,
                newValue: value
            })),
        });
        const savedLog = await log.save();
    } catch (error) {
        console.error('Error logging client creation:', error);
        throw error;
    }
};

//Log updates to existing client
export const logClientUpdate = async (userId, oldData, newData) => {
    try{
        const changes = findChanges(oldData, newData);

        if (changes.length > 0) {
            const log = new LogModel({
                clientId: oldData.id,
                userId: userId,
                action: 'update',
                changes
            });

            const savedLog = await log.save();
        } else {
            console.log('No changes to log for client update');
        }
    } catch (error) {
        console.error('Error logging client update:', error);
    }
};

//Log deletion of client
export const logClientDeletion = async (userId, clientData) => {
    try {
        const log = new LogModel({
            clientId: clientData.id,
            userId: userId, 
            action: 'delete',
            changes: [{
                field: 'status',
                oldValue: 'active',
                newValue: 'deleted'
            }]
        });
        
        const savedLog = await log.save();
    } catch(error) {
        console.error('Error logging client deletion:', error)
    }
};

//Get logs for a specific client
export const getClientLogs = async (clientId) => {
    try {
        return await LogModel.find({clientId})
            .sort({timestamp: -1})
            .lean();
    } catch(error) {
        console.error('Error fetching Client logs:', error);
        return [];
    }
};