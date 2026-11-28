# WhatsApp order notification templates

Create and get approval for these two **Utility** templates in WhatsApp Manager before enabling sends. Template names and language must match the server environment variables.

## 1. Customer template

- Name: `vastra_order_customer`
- Category: Utility
- Language: English (`en`)

Body:
`Hi {{1}}, we have received your order {{2}}. Items: {{3}}. Order total: INR {{4}}. Payment method: {{5}}. Our Vastra Boutique team will contact you if anything else is needed. Thank you!`

Example values:
- {{1}} Ankur Jain
- {{2}} VB123456789
- {{3}} Teal embroidered set (Size M) x1
- {{4}} 3499
- {{5}} Cash on Delivery

## 2. Boutique owner template

- Name: `vastra_new_order_owner`
- Category: Utility
- Language: English (`en`)

Body:
`New Vastra Boutique order {{1}}. Customer: {{2}}. Phone: {{3}}. Delivery address: {{4}}. Items: {{5}}. Total: INR {{6}}. Payment: {{7}}. Please open the admin orders page to manage this order.`

Example values:
- {{1}} VB123456789
- {{2}} Ankur Jain
- {{3}} 918005642838
- {{4}} Shivpuri Extension, Jhotwara, Jaipur, Rajasthan, 302001
- {{5}} Teal embroidered set (Size M) x1
- {{6}} 3499
- {{7}} Cash on Delivery

## Environment variables

Copy the values from `server/.env.example` into the local `server/.env` and fill in the real Meta credentials. Never commit `server/.env`.

- `WHATSAPP_ACCESS_TOKEN`: server-side Meta access token
- `WHATSAPP_PHONE_NUMBER_ID`: Cloud API sender's Phone Number ID (not the recipient's number)
- `WHATSAPP_OWNER_PHONE`: recipient number; defaults to 8005642838
- Template names and language must exactly match approved templates.

The checkout opt-in checkbox is intentionally unchecked. The customer message is sent only when the customer actively opts in. The owner alert is attempted for every newly created order. WhatsApp send failures do not roll back a saved order.

Meta docs: https://developers.facebook.com/docs/whatsapp/cloud-api/
