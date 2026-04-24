const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

const handleResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      (Array.isArray(payload.errors)
        ? payload.errors
            .map((item) => item?.msg || item?.message || item)
            .filter(Boolean)
            .join(', ')
        : '') ||
      payload.message ||
      payload.error ||
      'Request failed';
    throw new Error(detail);
  }

  return payload;
};

export const getClassrooms = async (filters) => {
  const response = await fetch(`/api/classrooms${buildQueryString(filters)}`);
  return handleResponse(response);
};

export const createClassroom = async (classroom) => {
  const response = await fetch("/api/classrooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classroom),
  });

  return handleResponse(response);
};

export const updateClassroom = async (id, classroom) => {
  const response = await fetch(`/api/classrooms/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classroom),
  });

  return handleResponse(response);
};

export const deleteClassroom = async (id) => {
  const response = await fetch(`/api/classrooms/${id}`, {
    method: "DELETE",
  });

  return handleResponse(response);
};

export const chatWithClassroomBot = async (message) => {
  const response = await fetch("/api/classrooms/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  return handleResponse(response);
};
