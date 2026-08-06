import {listPractitioners} from './practitioners.service.js';

export async function list(request, response) {
  response.json({
    practitioners: await listPractitioners(request.query)
  });
}
