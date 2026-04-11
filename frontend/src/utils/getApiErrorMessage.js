const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors[0]?.msg || fallbackMessage;
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    return responseData.message[0] || fallbackMessage;
  }

  return responseData?.message || error?.message || fallbackMessage;
};

export default getApiErrorMessage;
