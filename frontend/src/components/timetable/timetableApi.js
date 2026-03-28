import api from '../../services/api';

const createCrudClient = (resource) => ({
  getAll: async (params = {}) => {
    const response = await api.get(resource, { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`${resource}/${id}`);
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post(resource, payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.put(`${resource}/${id}`, payload);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`${resource}/${id}`);
    return response.data;
  },
});

const timetableApi = {
  courses: createCrudClient('/courses'),
  lecturers: createCrudClient('/lecturers'),
  rooms: createCrudClient('/rooms'),
  timeslots: createCrudClient('/timeslots'),
  timetables: {
    list: async (params = {}) => {
      const response = await api.get('/timetables', { params });
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/timetables/${id}`);
      return response.data;
    },
    create: async (payload) => {
      const response = await api.post('/timetables', payload);
      return response.data;
    },
    update: async (id, payload) => {
      const response = await api.put(`/timetables/${id}`, payload);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/timetables/${id}`);
      return response.data;
    },
    clear: async (payload = {}) => {
      try {
        const response = await api.post('/timetables/clear', payload);
        return response.data;
      } catch (error) {
        if ([404, 405].includes(error?.response?.status)) {
          try {
            const fallbackResponse = await api.delete('/timetables/clear', {
              params: payload,
            });
            return fallbackResponse.data;
          } catch (fallbackError) {
            if ([404, 405].includes(fallbackError?.response?.status)) {
              const legacyResponse = await api.delete('/timetables', {
                params: payload,
              });
              return legacyResponse.data;
            }

            throw fallbackError;
          }
        }

        throw error;
      }
    },
    generate: async (payload) => {
      const response = await api.post('/timetables/generate', payload);
      return response.data;
    },
  },
};

export default timetableApi;
