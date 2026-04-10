Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      version: "HARD-OVERRIDE-TEST-999",
      count: 999,
      orders: [
        {
          order_id: "debug-1",
          customer_name: "Debug One",
          customer_phone: "+353851111111",
          review_link: "https://g.page/r/streeteatz/review",
        },
      ],
    }),
    {
      status: 418,
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Version": "HARD-OVERRIDE-TEST-999",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    },
  );
});
